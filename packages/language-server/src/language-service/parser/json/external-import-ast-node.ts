import { YAMLDocument } from "../index"
import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"
import { JSONSchema } from "../../jsonSchema"
import * as Path from "path"
import {
	ValidationResult,
	IProblem,
	ProblemSeverity
} from "./validation-result"
import { DocumentNotFoundError } from "../../services/document"

const IMPORT_REGEXP = /^\${file\((.+)\.(yml|yaml)\)(:\w+)?}$/
const FILE_URI_PREFIX = "file://"

export type OnRegisterExternalImport = (uri: string, parentUri: string) => void

export type OnRegisterPartialSchema = (
	uri: string,
	parentUri: string,
	schema: JSONSchema,
	property: string | void
) => void

export type OnValidateExternalImport = (
	uri: string,
	parentUri: string,
	problems: IProblem[]
) => void

export type GetExternalImportDocument = (
	uri: string,
	parentUri: string
) => Promise<YAMLDocument>

export interface ExternalImportsCallbacks {
	onRegisterExternalImport: OnRegisterExternalImport
	onRegisterPartialSchema: OnRegisterPartialSchema
	onValidateExternalImport: OnValidateExternalImport
	getExternalImportDocument: GetExternalImportDocument
}

export class ExternalImportASTNode extends ASTNode<string> {
	static isImportPath(path: string) {
		return IMPORT_REGEXP.test(path)
	}

	private uri: string | void
	private parameter: string | void = undefined
	private callbacks: ExternalImportsCallbacks

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		value: string,
		start: number,
		end: number,
		callbacks: ExternalImportsCallbacks
	) {
		super(document, parent, "string", name, start, end)
		this.callbacks = callbacks
		this.value = value
	}

	set value(newValue: string) {
		const [, path, extension, parameter] = IMPORT_REGEXP.exec(newValue)

		this.uri = this.resolvePath(`${path}.${extension}`)
		// remove leading `:`
		this.parameter = parameter && parameter.substr(1)

		if (this.uri) {
			this.callbacks.onRegisterExternalImport(this.uri, this.document.uri)
		}
	}

	async validate(
		schema: JSONSchema,
		validationResult: ValidationResult
	): Promise<void> {
		if (this.uri) {
			this.callbacks.onRegisterPartialSchema(
				this.uri,
				this.document.uri,
				schema,
				this.parameter
			)

			try {
				const yamlDocument = await this.callbacks.getExternalImportDocument(
					this.uri,
					this.document.uri
				)
				const importSchema = this.getImportSchema(schema)

				const problems = await yamlDocument.validate(importSchema)

				this.callbacks.onValidateExternalImport(
					this.uri,
					this.document.uri,
					problems
				)
			} catch (err) {
				if (err instanceof DocumentNotFoundError) {
					validationResult.problems.push({
						message: "File not found",
						location: {
							start: this.start,
							end: this.end
						},
						severity: ProblemSeverity.Warning
					})
				}

				return
			}
		}
	}

	getUri(): string | void {
		return this.uri
	}

	private getImportSchema(schema: JSONSchema): JSONSchema {
		if (!this.parameter) {
			return schema
		}

		const newSchema: JSONSchema = {
			additionalProperties: true,
			type: "object",
			properties: {
				[this.parameter]: schema
			}
		}

		return newSchema
	}

	private resolveOpts(path: string): string | void {
		const newPath = path.replace("${opt:stage}", "dev")

		if (newPath.includes("${")) {
			return undefined
		}

		return newPath
	}

	private resolvePath(path: string): string | void {
		if (Path.isAbsolute(path)) {
			return this.resolveOpts(path)
		} else {
			if (this.document.uri.startsWith(FILE_URI_PREFIX)) {
				return this.resolveOpts(
					FILE_URI_PREFIX +
						Path.join(
							Path.dirname(
								this.document.uri.replace(FILE_URI_PREFIX, "")
							),
							path
						)
				)
			}
		}
	}
}
