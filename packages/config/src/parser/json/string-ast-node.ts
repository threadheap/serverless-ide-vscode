import * as Json from "jsonc-parser"

import { CustomTag, JSONSchema } from "../../model"
import { YAMLDocument } from "../index"
import { ASTNode, ISchemaCollector } from "./ast-node"
import localize from "./localize"
import { ProblemSeverity, ValidationResult } from "./validation-result"

export class StringASTNode extends ASTNode<string> {
	isKey: boolean

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		isKey: boolean,
		start: number,
		end?: number,
		customTag?: CustomTag
	) {
		super(document, parent, "string", name, start, end, customTag)
		this.isKey = isKey
		this.value = ""
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

		if (schema.minLength && this.value.length < schema.minLength) {
			validationResult.problems.push({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				message: localize(
					"minLengthWarning",
					"String is shorter than the minimum length of {0}.",
					schema.minLength
				)
			})
		}

		if (schema.maxLength && this.value.length > schema.maxLength) {
			validationResult.problems.push({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				message: localize(
					"maxLengthWarning",
					"String is longer than the maximum length of {0}.",
					schema.maxLength
				)
			})
		}

		if (schema.pattern) {
			const regex = new RegExp(schema.pattern)
			if (!regex.test(this.value)) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message:
						schema.patternErrorMessage ||
						schema.errorMessage ||
						localize(
							"patternWarning",
							'String does not match the pattern of "{0}".',
							schema.pattern
						)
				})
			}
		}
	}
}
