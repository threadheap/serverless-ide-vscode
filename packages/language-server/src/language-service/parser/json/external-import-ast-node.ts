import { YAMLDocument } from "../index"
import { ASTNode, ISchemaCollector } from "./ast-node"
import * as Json from "jsonc-parser"
import { JSONSchema } from "../../jsonSchema"
import { CustomTag } from "../../model/custom-tags"
import { ValidationResult } from "./validation-result"

const IMPORT_REGEXP = /^\${file\((.+).(yml|yaml)\)(:\w+)?}$/

export class ExternalImportASTNode extends ASTNode<string> {
	static isImportPath(path: string) {
		return IMPORT_REGEXP.test(path)
	}

	private path: string
	private parameter: string | void = undefined

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		value: string,
		start: number,
		end?: number,
		customTag?: CustomTag
	) {
		super(document, parent, "string", name, start, end, customTag)
		this.value = value
	}

	set value(newValue: string) {
		const [, path, parameter] = IMPORT_REGEXP.exec(newValue)

		this.path = path
		this.parameter = parameter
	}

	validate(
		schema: JSONSchema,
		validationResult: ValidationResult,
		matchingSchemas: ISchemaCollector
	): void {
		if (!matchingSchemas.include(this)) {
			return
		}

		super.validate(schema, validationResult, matchingSchemas)
	}
}
