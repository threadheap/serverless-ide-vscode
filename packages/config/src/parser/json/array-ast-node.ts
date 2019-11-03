import * as Json from "jsonc-parser"

import { CustomTag, JSONSchema } from "../../model"
import { YAMLDocument } from "../index"
import { ASTNode, ISchemaCollector } from "./ast-node"
import localize from "./localize"
import { ProblemSeverity, ValidationResult } from "./validation-result"

export class ArrayASTNode extends ASTNode<unknown[]> {
	items: ASTNode[]

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		start: number,
		end?: number,
		customTag?: CustomTag
	) {
		super(document, parent, "array", name, start, end, customTag)
		this.items = []
	}

	get value(): unknown[] {
		return this.items.map(v => v.value)
	}

	getChildNodes(): ASTNode[] {
		return this.items
	}

	getLastChild(): ASTNode {
		return this.items[this.items.length - 1]
	}

	addItem(item: ASTNode): boolean {
		if (item) {
			this.items.push(item)
			return true
		}
		return false
	}

	visit(visitor: (node: ASTNode) => boolean): boolean {
		let ctn = visitor(this)
		for (let i = 0; i < this.items.length && ctn; i++) {
			ctn = this.items[i].visit(visitor)
		}
		return ctn
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

		if (Array.isArray(schema.items)) {
			const subSchemas = schema.items as JSONSchema[]
			subSchemas.forEach((subSchema, index) => {
				const itemValidationResult = new ValidationResult()
				const item = this.items[index]
				if (item) {
					item.validate(
						subSchema,
						itemValidationResult,
						matchingSchemas
					)
					validationResult.mergePropertyMatch(itemValidationResult)
				} else if (this.items.length >= subSchemas.length) {
					validationResult.propertiesValueMatches++
				}
			})
			if (this.items.length > subSchemas.length) {
				if (typeof schema.additionalItems === "object") {
					for (
						let i = subSchemas.length;
						i < this.items.length;
						i++
					) {
						const itemValidationResult = new ValidationResult()
						this.items[i].validate(
							schema.additionalItems as any,
							itemValidationResult,
							matchingSchemas
						)
						validationResult.mergePropertyMatch(
							itemValidationResult
						)
					}
				} else if (schema.additionalItems === false) {
					validationResult.problems.push({
						location: { start: this.start, end: this.end },
						severity: ProblemSeverity.Warning,
						message: localize(
							"additionalItemsWarning",
							"Array has too many items according to schema. Expected {0} or fewer.",
							subSchemas.length
						)
					})
				}
			}
		} else if (schema.items) {
			this.items.forEach(item => {
				const itemValidationResult = new ValidationResult()
				item.validate(
					schema.items as JSONSchema,
					itemValidationResult,
					matchingSchemas
				)
				validationResult.mergePropertyMatch(itemValidationResult)
			})
		}

		if (schema.minItems && this.items.length < schema.minItems) {
			validationResult.problems.push({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				message: localize(
					"minItemsWarning",
					"Array has too few items. Expected {0} or more.",
					schema.minItems
				)
			})
		}

		if (schema.maxItems && this.items.length > schema.maxItems) {
			validationResult.problems.push({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Warning,
				message: localize(
					"maxItemsWarning",
					"Array has too many items. Expected {0} or fewer.",
					schema.minItems
				)
			})
		}

		if (schema.uniqueItems === true) {
			const values = this.items.map(node => {
				return node.value
			})
			const duplicates = values.some((value, index) => {
				return index !== values.lastIndexOf(value)
			})
			if (duplicates) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message: localize(
						"uniqueItemsWarning",
						"Array has duplicate items."
					)
				})
			}
		}
	}
}
