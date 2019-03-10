import * as Json from "jsonc-parser"
import forEach = require("lodash/forEach")
import { TextDocument } from "vscode-languageserver"
import * as nls from "vscode-nls"
import { SingleYAMLDocument } from "../../parser"
import { JSONSchema, JSONSchemaMap } from "./../../jsonSchema"
import { applyDocumentMutations } from "./mutation"

const localize = nls.loadMessageBundle()

function getParseErrorMessage(errorCode: Json.ParseErrorCode): string {
	switch (errorCode) {
		case Json.ParseErrorCode.InvalidSymbol:
			return localize("error.invalidSymbol", "Invalid symbol")
		case Json.ParseErrorCode.InvalidNumberFormat:
			return localize(
				"error.invalidNumberFormat",
				"Invalid number format"
			)
		case Json.ParseErrorCode.PropertyNameExpected:
			return localize(
				"error.propertyNameExpected",
				"Property name expected"
			)
		case Json.ParseErrorCode.ValueExpected:
			return localize("error.valueExpected", "Value expected")
		case Json.ParseErrorCode.ColonExpected:
			return localize("error.colonExpected", "Colon expected")
		case Json.ParseErrorCode.CommaExpected:
			return localize("error.commaExpected", "Comma expected")
		case Json.ParseErrorCode.CloseBraceExpected:
			return localize(
				"error.closeBraceExpected",
				"Closing brace expected"
			)
		case Json.ParseErrorCode.CloseBracketExpected:
			return localize(
				"error.closeBracketExpected",
				"Closing bracket expected"
			)
		case Json.ParseErrorCode.EndOfFileExpected:
			return localize("error.endOfFileExpected", "End of file expected")
		default:
			return ""
	}
}

// tslint:disable-next-line: max-classes-per-file
export class UnresolvedSchema {
	public schema: JSONSchema
	public errors: string[]

	constructor(schema: JSONSchema, errors: string[] = []) {
		this.schema = schema
		this.errors = errors
	}
}

// tslint:disable-next-line: max-classes-per-file
export class ResolvedSchema {
	public schema: JSONSchema
	public errors: string[]

	constructor(schema: JSONSchema, errors: string[] = []) {
		this.schema = schema
		this.errors = errors
	}

	public getSection(path: string[]): JSONSchema {
		return this.getSectionRecursive(path, this.schema)
	}

	private getSectionRecursive(
		path: string[],
		schema: JSONSchema
	): JSONSchema {
		if (!schema || path.length === 0) {
			return schema
		}
		const next = path.shift()

		if (schema.properties && schema.properties[next]) {
			return this.getSectionRecursive(path, schema.properties[next])
		} else if (schema.patternProperties) {
			Object.keys(schema.patternProperties).forEach(pattern => {
				const regex = new RegExp(pattern)
				if (regex.test(next)) {
					return this.getSectionRecursive(
						path,
						schema.patternProperties[pattern]
					)
				}
			})
		} else if (schema.additionalProperties) {
			return this.getSectionRecursive(path, schema.additionalProperties)
		} else if (next.match("[0-9]+")) {
			if (schema.items) {
				return this.getSectionRecursive(path, schema.items)
			} else if (Array.isArray(schema.items)) {
				try {
					const index = parseInt(next, 10)
					if (schema.items[index]) {
						return this.getSectionRecursive(
							path,
							schema.items[index]
						)
					}
					return null
				} catch (e) {
					return null
				}
			}
		}

		return null
	}
}

const resolveSchemaContent = async (
	schemaToResolve: UnresolvedSchema,
	schemaURL: string
): Promise<ResolvedSchema> => {
	const resolveErrors: string[] = schemaToResolve.errors.slice(0)
	const schema = schemaToResolve.schema
	const contextService = this.contextService

	const findSection = (selectonSchema: JSONSchema, path: string): any => {
		if (!path) {
			return selectonSchema
		}
		let current: any = selectonSchema
		if (path[0] === "/") {
			path = path.substr(1)
		}
		path.split("/").some(part => {
			current = current[part]
			return !current
		})
		return current
	}

	const resolveLink = (
		node: any,
		linkedSchema: JSONSchema,
		linkPath: string
	): void => {
		const section = findSection(linkedSchema, linkPath)
		if (section) {
			for (const key in section) {
				if (section.hasOwnProperty(key) && !node.hasOwnProperty(key)) {
					node[key] = section[key]
				}
			}
		} else {
			resolveErrors.push(
				localize(
					"json.schema.invalidref",
					"$ref '{0}' in {1} can not be resolved.",
					linkPath,
					linkedSchema.id
				)
			)
		}
		delete node.$ref
	}

	const resolveExternalLink = async (
		node: any,
		uri: string,
		linkPath: string,
		parentSchemaURL: string
	): Promise<any> => {
		if (contextService && !/^\w+:\/\/.*/.test(uri)) {
			uri = contextService.resolveRelativePath(uri, parentSchemaURL)
		}
		uri = this.normalizeId(uri)
		const unresolvedSchema = await this.getOrAddSchemaHandle(
			uri
		).getUnresolvedSchema()
		if (unresolvedSchema.errors.length) {
			const loc = linkPath ? uri + "#" + linkPath : uri
			resolveErrors.push(
				localize(
					"json.schema.problemloadingref",
					"Problems loading reference '{0}': {1}",
					loc,
					unresolvedSchema.errors[0]
				)
			)
		}
		resolveLink(node, unresolvedSchema.schema, linkPath)
		return resolveRefs(node, unresolvedSchema.schema, uri)
	}

	const resolveRefs = (
		node: JSONSchema,
		parentSchema: JSONSchema,
		parentSchemaURL: string
	): Promise<any> => {
		if (!node) {
			return Promise.resolve(null)
		}

		const toWalk: JSONSchema[] = [node]
		const seen: JSONSchema[] = []

		const openPromises: Array<Promise<any>> = []

		const collectEntries = (...entries: JSONSchema[]) => {
			for (const entry of entries) {
				if (typeof entry === "object") {
					toWalk.push(entry)
				}
			}
		}
		const collectMapEntries = (...maps: JSONSchemaMap[]) => {
			for (const map of maps) {
				if (typeof map === "object") {
					forEach(map, (value, key) => {
						const entry = map[key]
						toWalk.push(entry)
					})
				}
			}
		}
		const collectArrayEntries = (...arrays: JSONSchema[][]) => {
			for (const array of arrays) {
				if (Array.isArray(array)) {
					toWalk.push.apply(toWalk, array)
				}
			}
		}
		while (toWalk.length) {
			const next = toWalk.pop()
			if (seen.indexOf(next) >= 0) {
				continue
			}
			seen.push(next)
			if (next.$ref) {
				const segments = next.$ref.split("#", 2)
				if (segments[0].length > 0) {
					openPromises.push(
						resolveExternalLink(
							next,
							segments[0],
							segments[1],
							parentSchemaURL
						)
					)
					continue
				} else {
					resolveLink(next, parentSchema, segments[1])
				}
			}
			collectEntries(next.items, next.additionalProperties, next.not)
			collectMapEntries(
				next.definitions,
				next.properties,
				next.patternProperties,
				next.dependencies as JSONSchemaMap
			)
			collectArrayEntries(
				next.anyOf,
				next.allOf,
				next.oneOf,
				next.items as JSONSchema[],
				next.schemaSequence
			)
		}
		return Promise.all(openPromises)
	}

	await resolveRefs(schema, schema, schemaURL)
	return new ResolvedSchema(schema, resolveErrors)
}

export const getSchemaForDocument = async (
	document: TextDocument,
	yamlDocument: SingleYAMLDocument
): Promise<ResolvedSchema | void> => {}
