"use strict"

import * as Json from "jsonc-parser"
import URI from "vscode-uri"
import { JSONSchema, JSONSchemaMap } from "../../jsonSchema"
import { WorkspaceContextService } from "../../languageService"
import * as Strings from "../../utils/strings"
import requestService from "../request"
import { SingleYAMLDocument } from "./../../parser"

import forEach = require("lodash/forEach")
import * as nls from "vscode-nls"
import { applyDocumentMutations } from "./mutation"
const localize = nls.loadMessageBundle()

/**
 * getParseErrorMessage has been removed from jsonc-parser since 1.0.0
 *
 * see https://github.com/Microsoft/node-jsonc-parser/blob/42ec16f9c91582d4267a0c48199cdac283c90fc9/CHANGELOG.md
 * 1.0.0
 *  remove nls dependency (remove getParseErrorMessage)
 */
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

export interface IJSONSchemaService {
	/**
	 * Registers a schema file in the current workspace to be applicable to files that match the pattern
	 */
	registerExternalSchema(
		uri: string,
		filePatterns?: string[],
		unresolvedSchema?: JSONSchema
	): ISchemaHandle

	/**
	 * Clears all cached schema files
	 */
	clearExternalSchemas(): void

	/**
	 * Registers contributed schemas
	 */
	setSchemaContributions(schemaContributions: ISchemaContributions): void

	/**
	 * Looks up the appropriate schema for the given URI
	 */
	getSchemaForResource(resource: string): Promise<ResolvedSchema | null>

	/**
	 *
	 * Looks up the appropriate schema for a single yaml document
	 * and applies real time mutations
	 */
	getSchemaForDocument(
		documentUri: string,
		yamlDocument: SingleYAMLDocument,
		documentIndex: number
	): Promise<ResolvedSchema | void>

	/**
	 * Returns all registered schema ids
	 */
	getRegisteredSchemaIds(filter?: (scheme) => boolean): string[]
}

export interface ISchemaAssociations {
	[pattern: string]: string[]
}

export interface ISchemaContributions {
	schemas?: { [id: string]: JSONSchema }
	schemaAssociations?: ISchemaAssociations
}

export declare type CustomSchemaProvider = (uri: string) => Promise<string>

export interface ISchemaHandle {
	/**
	 * The schema id
	 */
	url: string

	/**
	 * The schema from the file, with potential $ref references
	 */
	getUnresolvedSchema(): Promise<UnresolvedSchema>

	/**
	 * The schema from the file, with references resolved
	 */
	getResolvedSchema(): Promise<ResolvedSchema>
}

export class FilePatternAssociation {
	private schemas: string[]
	private combinedSchemaId: string
	private patternRegExp: RegExp
	private combinedSchema: ISchemaHandle

	constructor(pattern: string) {
		this.combinedSchemaId =
			"schemaservice://combinedSchema/" + encodeURIComponent(pattern)
		try {
			this.patternRegExp = Strings.convertSimple2RegExp(pattern)
		} catch (e) {
			// invalid pattern
			this.patternRegExp = null
		}
		this.schemas = []
		this.combinedSchema = null
	}

	public addSchema(id: string) {
		this.schemas.push(id)
		this.combinedSchema = null
	}

	public matchesPattern(fileName: string): boolean {
		return this.patternRegExp && this.patternRegExp.test(fileName)
	}

	public getCombinedSchema(service: JSONSchemaService): ISchemaHandle {
		if (!this.combinedSchema) {
			this.combinedSchema = service.createCombinedSchema(
				this.combinedSchemaId,
				this.schemas
			)
		}
		return this.combinedSchema
	}
}

// tslint:disable-next-line: max-classes-per-file
class SchemaHandle implements ISchemaHandle {
	public url: string

	private resolvedSchema: Promise<ResolvedSchema>
	private unresolvedSchema: Promise<UnresolvedSchema>
	private service: JSONSchemaService

	constructor(
		service: JSONSchemaService,
		url: string,
		unresolvedSchemaContent?: JSONSchema
	) {
		this.service = service
		this.url = url
		if (unresolvedSchemaContent) {
			this.unresolvedSchema = this.service.promise.resolve(
				new UnresolvedSchema(unresolvedSchemaContent)
			)
		}
	}

	public getUnresolvedSchema(): Promise<UnresolvedSchema> {
		if (!this.unresolvedSchema) {
			this.unresolvedSchema = this.service.loadSchema(this.url)
		}
		return this.unresolvedSchema
	}

	public getResolvedSchema(): Promise<ResolvedSchema> {
		if (!this.resolvedSchema) {
			this.resolvedSchema = this.getUnresolvedSchema().then(
				unresolved => {
					return this.service.resolveSchemaContent(
						unresolved,
						this.url
					)
				}
			)
		}
		return this.resolvedSchema
	}

	public clearSchema(): void {
		this.resolvedSchema = null
		this.unresolvedSchema = null
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

// tslint:disable-next-line: max-classes-per-file
export class JSONSchemaService implements IJSONSchemaService {
	public get promise() {
		return this.promiseConstructor
	}
	private contributionSchemas: { [id: string]: SchemaHandle }
	private contributionAssociations: { [id: string]: string[] }

	private schemasById: { [id: string]: SchemaHandle }
	private filePatternAssociations: FilePatternAssociation[]
	private filePatternAssociationById: {
		[id: string]: FilePatternAssociation
	}
	private registeredSchemasIds: { [id: string]: boolean }

	private contextService: WorkspaceContextService
	private callOnDispose: Array<() => void>
	private promiseConstructor: PromiseConstructor

	constructor(
		contextService?: WorkspaceContextService,
		promiseConstructor?: PromiseConstructor
	) {
		this.contextService = contextService
		this.promiseConstructor = promiseConstructor || Promise
		this.callOnDispose = []
		this.contributionSchemas = {}
		this.contributionAssociations = {}
		this.schemasById = {}
		this.filePatternAssociations = []
		this.filePatternAssociationById = {}
		this.registeredSchemasIds = {}
	}

	public getRegisteredSchemaIds(filter?: (scheme) => boolean): string[] {
		return Object.keys(this.registeredSchemasIds).filter(id => {
			const scheme = URI.parse(id).scheme
			return scheme !== "schemaservice" && (!filter || filter(scheme))
		})
	}

	public dispose(): void {
		while (this.callOnDispose.length > 0) {
			this.callOnDispose.pop()()
		}
	}

	public onResourceChange(uri: string): boolean {
		uri = this.normalizeId(uri)
		const schemaFile = this.schemasById[uri]
		if (schemaFile) {
			schemaFile.clearSchema()
			return true
		}
		return false
	}

	public setSchemaContributions(
		schemaContributions: ISchemaContributions
	): void {
		if (schemaContributions.schemas) {
			const schemas = schemaContributions.schemas

			forEach(schemas, (schema, id) => {
				const normalizedId = this.normalizeId(id)
				this.contributionSchemas[normalizedId] = this.addSchemaHandle(
					normalizedId,
					schema
				)
			})
		}
		if (schemaContributions.schemaAssociations) {
			const schemaAssociations = schemaContributions.schemaAssociations

			forEach(schemaAssociations, (associations, pattern) => {
				this.contributionAssociations[pattern] = associations

				const fpa = this.getOrAddFilePatternAssociation(pattern)
				associations.forEach(schemaId => {
					const id = this.normalizeId(schemaId)
					fpa.addSchema(id)
				})
			})
		}
	}

	public registerExternalSchema(
		uri: string,
		filePatterns: string[] = null,
		unresolvedSchemaContent?: JSONSchema
	): ISchemaHandle {
		const id = this.normalizeId(uri)
		this.registeredSchemasIds[id] = true

		if (filePatterns) {
			filePatterns.forEach(pattern => {
				this.getOrAddFilePatternAssociation(pattern).addSchema(id)
			})
		}
		return unresolvedSchemaContent
			? this.addSchemaHandle(id, unresolvedSchemaContent)
			: this.getOrAddSchemaHandle(id)
	}

	public clearExternalSchemas(): void {
		this.schemasById = {}
		this.filePatternAssociations = []
		this.filePatternAssociationById = {}
		this.registeredSchemasIds = {}

		forEach(this.contributionSchemas, (schema, id) => {
			this.schemasById[id] = this.contributionSchemas[id]
			this.registeredSchemasIds[id] = true
		})

		forEach(this.contributionAssociations, (associations, pattern) => {
			const fpa = this.getOrAddFilePatternAssociation(pattern)

			this.contributionAssociations[pattern].forEach(schemaId => {
				const id = this.normalizeId(schemaId)
				fpa.addSchema(id)
			})
		})
	}

	public getResolvedSchema(schemaId: string): Promise<ResolvedSchema> {
		const id = this.normalizeId(schemaId)
		const schemaHandle = this.schemasById[id]
		if (schemaHandle) {
			return schemaHandle.getResolvedSchema()
		}
		return this.promise.resolve(null)
	}

	public async loadSchema(url: string): Promise<UnresolvedSchema> {
		try {
			const content = await requestService(url)
			if (!content) {
				const errorMessage = localize(
					"json.schema.nocontent",
					"Unable to load schema from '{0}': No content.",
					toDisplayString(url)
				)
				return new UnresolvedSchema({} as JSONSchema, [errorMessage])
			}
			let schemaContent: JSONSchema = {}
			const jsonErrors = []
			schemaContent = Json.parse(content, jsonErrors)
			const errors = jsonErrors.length
				? [
						localize(
							"json.schema.invalidFormat",
							"Unable to parse content from '{0}': {1}.",
							toDisplayString(url),
							getParseErrorMessage(jsonErrors[0])
						)
				  ]
				: []
			return new UnresolvedSchema(schemaContent, errors)
		} catch (error) {
			const errorMessage = localize(
				"json.schema.unabletoload",
				"Unable to load schema from '{0}': {1}",
				toDisplayString(url),
				error.toString()
			)
			return new UnresolvedSchema({} as JSONSchema, [errorMessage])
		}
	}

	public async resolveSchemaContent(
		schemaToResolve: UnresolvedSchema,
		schemaURL: string
	): Promise<ResolvedSchema> {
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
					if (
						section.hasOwnProperty(key) &&
						!node.hasOwnProperty(key)
					) {
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
			return this.promise.all(openPromises)
		}

		await resolveRefs(schema, schema, schemaURL)
		return new ResolvedSchema(schema, resolveErrors)
	}

	public async getSchemaForResource(
		resource: string
	): Promise<ResolvedSchema> {
		// check for matching file names, last to first
		for (let i = this.filePatternAssociations.length - 1; i >= 0; i--) {
			const entry = this.filePatternAssociations[i]
			if (entry.matchesPattern(resource)) {
				return await entry.getCombinedSchema(this).getResolvedSchema()
			}
		}
		return null
	}

	public async getSchemaForDocument(
		documentUri: string,
		yamlDocument: SingleYAMLDocument,
		documentIndex: number
	): Promise<ResolvedSchema | void> {
		const schema = await this.getSchemaForResource(documentUri)

		/**
		 * Probably redundant code
		 * most likely there won't be more than one schema
		 * per file type
		 */
		if (
			schema &&
			schema.schema &&
			schema.schema.schemaSequence &&
			schema.schema.schemaSequence[documentIndex]
		) {
			return applyDocumentMutations(
				new ResolvedSchema(schema.schema.schemaSequence[documentIndex]),
				yamlDocument
			)
		}

		return applyDocumentMutations(schema, yamlDocument)
	}

	public createCombinedSchema(
		combinedSchemaId: string,
		schemaIds: string[]
	): ISchemaHandle {
		if (schemaIds.length === 1) {
			return this.getOrAddSchemaHandle(schemaIds[0])
		} else {
			const combinedSchema: JSONSchema = {
				allOf: schemaIds.map(schemaId => ({ $ref: schemaId }))
			}
			return this.addSchemaHandle(combinedSchemaId, combinedSchema)
		}
	}

	private normalizeId(id: string) {
		// remove trailing '#', normalize drive capitalization
		return URI.parse(id).toString()
	}

	private addSchemaHandle(
		id: string,
		unresolvedSchemaContent?: JSONSchema
	): SchemaHandle {
		const schemaHandle = new SchemaHandle(this, id, unresolvedSchemaContent)
		this.schemasById[id] = schemaHandle
		return schemaHandle
	}

	private getOrAddSchemaHandle(
		id: string,
		unresolvedSchemaContent?: JSONSchema
	): ISchemaHandle {
		return (
			this.schemasById[id] ||
			this.addSchemaHandle(id, unresolvedSchemaContent)
		)
	}

	private getOrAddFilePatternAssociation(pattern: string) {
		let fpa = this.filePatternAssociationById[pattern]
		if (!fpa) {
			fpa = new FilePatternAssociation(pattern)
			this.filePatternAssociationById[pattern] = fpa
			this.filePatternAssociations.push(fpa)
		}
		return fpa
	}
}

function toDisplayString(url: string) {
	try {
		const uri = URI.parse(url)
		if (uri.scheme === "file") {
			return uri.fsPath
		}
	} catch (e) {
		// ignore
	}
	return url
}
