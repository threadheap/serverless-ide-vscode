import * as Json from "jsonc-parser"
import { Segment } from "vscode-json-languageservice"

import { YAMLDocument } from ".."
import { CustomTag, JSONSchema } from "../../model"
import * as objects from "../../utils"
import localize from "./localize"
import {
	ErrorCode,
	ProblemSeverity,
	ValidationResult
} from "./validation-result"

export interface IApplicableSchema {
	node: ASTNode
	inverted?: boolean
	schema: JSONSchema
}

export enum EnumMatch {
	Key,
	Enum
}

export interface ISchemaCollector {
	schemas: IApplicableSchema[]
	add(schema: IApplicableSchema): void
	merge(other: ISchemaCollector): void
	include(node: ASTNode): boolean
	newSub(): ISchemaCollector
}

// genericComparison tries to find the best matching schema using a generic comparison
function genericComparison(
	maxOneMatch: boolean,
	subValidationResult: ValidationResult,
	bestMatch,
	subSchema,
	subMatchingSchemas
) {
	if (
		!maxOneMatch &&
		!subValidationResult.hasProblems() &&
		!bestMatch.validationResult.hasProblems()
	) {
		// no errors, both are equally good matches
		bestMatch.matchingSchemas.merge(subMatchingSchemas)
		bestMatch.validationResult.propertiesMatches +=
			subValidationResult.propertiesMatches
		bestMatch.validationResult.propertiesValueMatches +=
			subValidationResult.propertiesValueMatches
	} else {
		const compareResult = subValidationResult.compareGeneric(
			bestMatch.validationResult
		)
		if (compareResult > 0) {
			// our node is the best matching so far
			bestMatch = {
				schema: subSchema,
				validationResult: subValidationResult,
				matchingSchemas: subMatchingSchemas
			}
		} else if (compareResult === 0) {
			// there's already a best matching but we are as good
			bestMatch.matchingSchemas.merge(subMatchingSchemas)
			bestMatch.validationResult.mergeEnumValues(subValidationResult)
		}
	}
	return bestMatch
}

export class ASTNode<TValue = unknown> {
	start: number
	end: number
	type: string
	parent: ASTNode
	location: Json.Segment
	customTag: CustomTag
	document: YAMLDocument
	protected _value: TValue = null

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		type: string,
		location: Json.Segment,
		start: number,
		end?: number,
		customTag?: CustomTag
	) {
		this.type = type
		this.location = location
		this.start = start
		this.end = end
		this.parent = parent
		this.customTag = customTag
		this.document = document
	}

	get value(): TValue {
		return this._value
	}

	set value(newValue: TValue) {
		this._value = newValue
	}

	get nodeType(): string {
		return this.customTag
			? this.customTag.returnType || this.type
			: this.type
	}

	getPath(): Json.JSONPath {
		const path = this.parent ? this.parent.getPath() : []

		if (this.location !== null) {
			path.push(this.location)
		}

		return path
	}

	getLocation(): Segment | null {
		return this.location
	}

	getChildNodes(): ASTNode[] {
		return []
	}

	getLastChild(): ASTNode {
		return null
	}

	contains(offset: number, includeRightBound: boolean = false): boolean {
		return (
			(offset >= this.start && offset < this.end) ||
			(includeRightBound && offset === this.end)
		)
	}

	toString(): string {
		return (
			"type: " +
			this.type +
			" (" +
			this.start +
			"/" +
			this.end +
			")" +
			(this.parent ? " parent: {" + this.parent.toString() + "}" : "")
		)
	}

	visit(visitor: (node: ASTNode) => boolean): boolean {
		return visitor(this)
	}

	getNodeFromOffset(offset: number): ASTNode {
		const findNode = (node: ASTNode): ASTNode => {
			if (offset >= node.start && offset < node.end) {
				const children = node.getChildNodes()
				for (
					let i = 0;
					i < children.length && children[i].start <= offset;
					i++
				) {
					const item = findNode(children[i])
					if (item) {
						return item
					}
				}
				return node
			}
			return null
		}
		return findNode(this)
	}

	getNodeCollectorCount(): number {
		const collector = []
		const findNode = (node: ASTNode): ASTNode => {
			const children = node.getChildNodes()

			children.forEach(child => {
				const item = findNode(child)
				if (item && item.type === "property") {
					collector.push(item)
				}
			})
			return node
		}
		findNode(this)
		return collector.length
	}

	getNodeFromOffsetEndInclusive(offset: number): ASTNode {
		const collector = []
		const findNode = (node: ASTNode): ASTNode => {
			if (offset >= node.start && offset <= node.end) {
				const children = node.getChildNodes()
				for (
					let i = 0;
					i < children.length && children[i].start <= offset;
					i++
				) {
					const item = findNode(children[i])
					if (item) {
						collector.push(item)
					}
				}
				return node
			}
			return null
		}
		const foundNode = findNode(this)
		let currMinDist = Number.MAX_VALUE
		let currMinNode = null

		collector.forEach(currNode => {
			const minDist = currNode.end - offset + (offset - currNode.start)
			if (minDist < currMinDist) {
				currMinNode = currNode
				currMinDist = minDist
			}
		})

		return currMinNode || foundNode
	}

	validate(
		schema: JSONSchema,
		validationResult: ValidationResult,
		matchingSchemas: ISchemaCollector
	): void {
		if (!matchingSchemas.include(this)) {
			return
		}

		if (this.nodeType === "any") {
			return
		}

		if (Array.isArray(schema.type)) {
			if ((schema.type as string[]).indexOf(this.nodeType) === -1) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message:
						schema.errorMessage ||
						localize(
							"typeArrayMismatchWarning",
							"Incorrect type. Expected one of {0}.",
							(schema.type as string[]).join(", ")
						)
				})
			}
		} else if (schema.type) {
			if (this.nodeType !== schema.type) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message:
						schema.errorMessage ||
						localize(
							"typeMismatchWarning",
							'Incorrect type. Expected "{0}".',
							schema.type
						)
				})
			}
		}
		if (Array.isArray(schema.allOf)) {
			schema.allOf.forEach(subSchema => {
				this.validate(subSchema, validationResult, matchingSchemas)
			})
		}
		if (schema.not) {
			const subValidationResult = new ValidationResult()
			const subMatchingSchemas = matchingSchemas.newSub()
			this.validate(schema.not, subValidationResult, subMatchingSchemas)
			if (!subValidationResult.hasProblems()) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message: localize(
						"notSchemaWarning",
						"Matches a schema that is not allowed."
					)
				})
			}
			subMatchingSchemas.schemas.forEach(ms => {
				ms.inverted = !ms.inverted
				matchingSchemas.add(ms)
			})
		}

		const testAlternatives = (
			alternatives: JSONSchema[],
			maxOneMatch: boolean
		) => {
			const matches = []

			// remember the best match that is used for error messages
			let bestMatch: {
				schema: JSONSchema
				validationResult: ValidationResult
				matchingSchemas: ISchemaCollector
			} = null
			alternatives.forEach(subSchema => {
				const subValidationResult = new ValidationResult()
				const subMatchingSchemas = matchingSchemas.newSub()

				this.validate(
					subSchema,
					subValidationResult,
					subMatchingSchemas
				)
				if (!subValidationResult.hasProblems()) {
					matches.push(subSchema)
				}
				if (!bestMatch) {
					bestMatch = {
						schema: subSchema,
						validationResult: subValidationResult,
						matchingSchemas: subMatchingSchemas
					}
				} else {
					bestMatch = genericComparison(
						maxOneMatch,
						subValidationResult,
						bestMatch,
						subSchema,
						subMatchingSchemas
					)
				}
			})

			if (matches.length > 1 && maxOneMatch) {
				validationResult.problems.push({
					location: { start: this.start, end: this.start + 1 },
					severity: ProblemSeverity.Warning,
					message: localize(
						"oneOfWarning",
						"Matches multiple schemas when only one must validate."
					)
				})
			}
			if (bestMatch !== null) {
				validationResult.merge(bestMatch.validationResult)
				validationResult.propertiesMatches +=
					bestMatch.validationResult.propertiesMatches
				validationResult.propertiesValueMatches +=
					bestMatch.validationResult.propertiesValueMatches
				matchingSchemas.merge(bestMatch.matchingSchemas)
			}
			return matches.length
		}
		if (Array.isArray(schema.anyOf)) {
			testAlternatives(schema.anyOf, false)
		}
		if (Array.isArray(schema.oneOf)) {
			testAlternatives(schema.oneOf, true)
		}

		if (Array.isArray(schema.enum)) {
			const val = this.value
			let enumValueMatch = false
			for (const e of schema.enum) {
				if (objects.equals(val, e)) {
					enumValueMatch = true
					break
				}
			}
			validationResult.enumValues = schema.enum
			validationResult.enumValueMatch = enumValueMatch
			if (!enumValueMatch) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					code: ErrorCode.EnumValueMismatch,
					message:
						schema.errorMessage ||
						localize(
							"enumWarning",
							"Value is not accepted. Valid values: {0}.",
							schema.enum.map(v => JSON.stringify(v)).join(", ")
						)
				})
			}
		}

		if (schema.deprecationMessage && this.parent) {
			validationResult.problems.push({
				location: { start: this.parent.start, end: this.parent.end },
				severity: ProblemSeverity.Warning,
				message: schema.deprecationMessage
			})
		}
		matchingSchemas.add({ node: this, schema })
	}

	get(path: Segment[]): ASTNode | null {
		let currentNode: ASTNode = this

		for (let segment of path) {
			const found = currentNode.getChildNodes().find(node => {
				if (node.location === null) {
					const { value } = node

					if (
						value &&
						value instanceof ASTNode &&
						value.location === segment
					) {
						currentNode = value
						return true
					}
				} else if (node.location === segment) {
					currentNode = node
					return true
				}

				return false
			})

			if (!found) {
				return null
			}
		}

		return currentNode || null
	}
}
