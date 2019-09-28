import { YAMLDocument } from "./../index"
import { ASTNode, ISchemaCollector } from "./ast-node"
import * as Json from "jsonc-parser"
import { JSONSchema } from "../../jsonSchema"
import { CustomTag } from "../../model/custom-tags"
import { ValidationResult, ProblemSeverity } from "./validation-result"
import localize from "./localize"

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

	async validate(
		schema: JSONSchema,
		validationResult: ValidationResult,
		matchingSchemas: ISchemaCollector
	): Promise<void> {
		if (!matchingSchemas.include(this)) {
			return
		}
		await super.validate(schema, validationResult, matchingSchemas)

		if (Array.isArray(schema.items)) {
			const subSchemas = schema.items as JSONSchema[]
			let index = 0
			for (const subSchema of subSchemas) {
				const itemValidationResult = new ValidationResult()
				const item = this.items[index]
				if (item) {
					await item.validate(
						subSchema,
						itemValidationResult,
						matchingSchemas
					)
					validationResult.mergePropertyMatch(itemValidationResult)
				} else if (this.items.length >= subSchemas.length) {
					validationResult.propertiesValueMatches++
				}
				index += 1
			}
			if (this.items.length > subSchemas.length) {
				if (typeof schema.additionalItems === "object") {
					for (
						let i = subSchemas.length;
						i < this.items.length;
						i++
					) {
						const itemValidationResult = new ValidationResult()
						await this.items[i].validate(
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
						severity: ProblemSeverity.Error,
						message: localize(
							"additionalItemsWarning",
							"Array has too many items according to schema. Expected {0} or fewer.",
							subSchemas.length
						)
					})
				}
			}
		} else if (schema.items) {
			for (const item of this.items) {
				const itemValidationResult = new ValidationResult()
				await item.validate(
					schema.items as JSONSchema,
					itemValidationResult,
					matchingSchemas
				)
				validationResult.mergePropertyMatch(itemValidationResult)
			}
		}

		if (schema.minItems && this.items.length < schema.minItems) {
			validationResult.problems.push({
				location: { start: this.start, end: this.end },
				severity: ProblemSeverity.Error,
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
				severity: ProblemSeverity.Error,
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
					severity: ProblemSeverity.Error,
					message: localize(
						"uniqueItemsWarning",
						"Array has duplicate items."
					)
				})
			}
		}
	}
}
