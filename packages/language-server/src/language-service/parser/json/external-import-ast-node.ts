import { YAMLDocument } from "../index"
import { ASTNode, ISchemaCollector } from "./ast-node"
import * as Json from "jsonc-parser"
import { JSONSchema } from "../../jsonSchema"
import { ValidationResult } from "./validation-result"

const IMPORT_REGEXP = /^\${file\((.+).(yml|yaml)\)(:\w+)?}$/

export type OnRegisterExternalImport = (uri: string, parentUri: string) => void

export type OnValidateExternalImport = (
	uri: string,
	schema: JSONSchema,
	property: string | void
) => void

export interface ExternalImportsCallbacks {
	onRegisterExternalImport: OnRegisterExternalImport
	onValidateExternalImport: OnValidateExternalImport
}

export class ExternalImportASTNode extends ASTNode<string> {
	static isImportPath(path: string) {
		return IMPORT_REGEXP.test(path)
	}

	private path: string
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
		this.value = value
		this.callbacks = callbacks
	}

	set value(newValue: string) {
		const [, path, parameter] = IMPORT_REGEXP.exec(newValue)

		this.path = path
		this.parameter = parameter
		this.callbacks.onRegisterExternalImport(this.path, this.document.uri)
	}

	validate(
		schema: JSONSchema,
		validationResult: ValidationResult,
		matchingSchemas: ISchemaCollector
	): void {
		if (!matchingSchemas.include(this)) {
			return
		}

		this.callbacks.onValidateExternalImport(
			this.path,
			schema,
			this.parameter
		)
	}
}
