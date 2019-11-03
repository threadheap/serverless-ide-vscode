import * as Json from "jsonc-parser"

import { YAMLDocument } from ".."
import { JSONSchema } from "../../model"
import { ArrayASTNode } from "./array-ast-node"
import { ASTNode, ISchemaCollector } from "./ast-node"
import localize from "./localize"
import { PropertyASTNode } from "./property-ast-node"
import { ProblemSeverity, ValidationResult } from "./validation-result"

export class ObjectASTNode extends ASTNode<null> {
	properties: PropertyASTNode[]

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		start: number,
		end?: number
	) {
		super(document, parent, "object", name, start, end)

		this.properties = []
	}

	get value(): any {
		const value: any = Object.create(null)
		this.properties.forEach(prop => {
			if (
				prop instanceof PropertyASTNode &&
				prop.value instanceof ASTNode
			) {
				const v = prop.value && prop.value.value
				if (v !== undefined) {
					value[prop.key.value] = v
				}
			}
		})
		return value
	}

	getChildNodes(): ASTNode[] {
		return this.properties
	}

	getLastChild(): ASTNode {
		return this.properties[this.properties.length - 1]
	}

	addProperty(node: PropertyASTNode): boolean {
		if (!node) {
			return false
		}
		this.properties.push(node)
		return true
	}

	getFirstProperty(key: string): PropertyASTNode | void {
		return this.properties.find(property => {
			return property.key.value === key
		})
	}

	getKeyList(): string[] {
		return this.properties.map(p => p.key.value)
	}

	visit(visitor: (node: ASTNode) => boolean): boolean {
		let ctn = visitor(this)
		for (let i = 0; i < this.properties.length && ctn; i++) {
			ctn = this.properties[i].visit(visitor)
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

		/**
		 * Early exit if custom tag is used inside string node
		 */
		if (
			schema.type === "string" &&
			this.properties.length === 1 &&
			this.properties[0].customTag
		) {
			return
		}

		super.validate(schema, validationResult, matchingSchemas)
		const seenKeys: { [key: string]: ASTNode } = Object.create(null)
		const unprocessedProperties: string[] = []
		this.properties.forEach(node => {
			const key = node.key.value

			// Replace the merge key with the actual values of what the node value points to in seen keys
			if (key === "<<" && node.value) {
				switch (node.value.type) {
					case "object": {
						;(node.value as ObjectASTNode).properties.forEach(
							propASTNode => {
								const propKey = propASTNode.key.value
								seenKeys[propKey] = propASTNode.value
								unprocessedProperties.push(propKey)
							}
						)
						break
					}
					case "array": {
						;(node.value as ArrayASTNode).items.forEach(
							(sequenceNode: ObjectASTNode) => {
								sequenceNode.properties.forEach(propASTNode => {
									const seqKey = propASTNode.key.value
									seenKeys[seqKey] = propASTNode.value
									unprocessedProperties.push(seqKey)
								})
							}
						)
						break
					}
					default: {
						break
					}
				}
			} else {
				seenKeys[key] = node.value
				unprocessedProperties.push(key)
			}
		})

		if (Array.isArray(schema.required)) {
			schema.required.forEach((propertyName: string) => {
				if (!seenKeys[propertyName]) {
					const key =
						this.parent &&
						this.parent &&
						(this.parent as PropertyASTNode).key
					const location = key
						? { start: key.start, end: key.end }
						: { start: this.start, end: this.start + 1 }
					validationResult.problems.push({
						location,
						severity: ProblemSeverity.Warning,
						message: localize(
							"MissingRequiredPropWarning",
							'Missing property "{0}".',
							propertyName
						)
					})
				}
			})
		}

		const propertyProcessed = (prop: string) => {
			let index = unprocessedProperties.indexOf(prop)
			while (index >= 0) {
				unprocessedProperties.splice(index, 1)
				index = unprocessedProperties.indexOf(prop)
			}
		}

		if (schema.properties) {
			Object.keys(schema.properties).forEach((propertyName: string) => {
				propertyProcessed(propertyName)
				const prop = schema.properties[propertyName]
				const child = seenKeys[propertyName]
				if (child) {
					const propertyValidationResult = new ValidationResult()
					child.validate(
						prop,
						propertyValidationResult,
						matchingSchemas
					)
					validationResult.mergePropertyMatch(
						propertyValidationResult
					)
				}
			})
		}

		if (schema.patternProperties) {
			Object.keys(schema.patternProperties).forEach(
				(propertyPattern: string) => {
					const regex = new RegExp(propertyPattern)
					unprocessedProperties
						.slice(0)
						.forEach((propertyName: string) => {
							if (regex.test(propertyName)) {
								propertyProcessed(propertyName)
								const child = seenKeys[propertyName]
								if (child) {
									const propertyValidationResult = new ValidationResult()
									child.validate(
										schema.patternProperties[
											propertyPattern
										],
										propertyValidationResult,
										matchingSchemas
									)
									validationResult.mergePropertyMatch(
										propertyValidationResult
									)
								}
							}
						})
				}
			)
		}

		if (typeof schema.additionalProperties === "object") {
			unprocessedProperties.forEach((propertyName: string) => {
				const child = seenKeys[propertyName]
				if (child) {
					const propertyValidationResult = new ValidationResult()
					child.validate(
						schema.additionalProperties as any,
						propertyValidationResult,
						matchingSchemas
					)
					validationResult.mergePropertyMatch(
						propertyValidationResult
					)
				}
			})
		} else if (schema.additionalProperties === false) {
			if (unprocessedProperties.length > 0) {
				unprocessedProperties.forEach((propertyName: string) => {
					const child = seenKeys[propertyName]
					if (child) {
						let propertyNode = null
						if (child.type !== "property") {
							propertyNode = child.parent as PropertyASTNode
							if (propertyNode.type === "object") {
								propertyNode = propertyNode.properties[0]
							}
						} else {
							propertyNode = child
						}
						validationResult.problems.push({
							location: {
								start: propertyNode.key.start,
								end: propertyNode.key.end
							},
							severity: ProblemSeverity.Warning,
							message:
								schema.errorMessage ||
								localize(
									"DisallowedExtraPropWarning",
									"Unexpected property {0}",
									propertyName
								)
						})
					}
				})
			}
		}

		if (schema.maxProperties) {
			if (this.properties.length > schema.maxProperties) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message: localize(
						"MaxPropWarning",
						"Object has more properties than limit of {0}.",
						schema.maxProperties
					)
				})
			}
		}

		if (schema.minProperties) {
			if (this.properties.length < schema.minProperties) {
				validationResult.problems.push({
					location: { start: this.start, end: this.end },
					severity: ProblemSeverity.Warning,
					message: localize(
						"MinPropWarning",
						"Object has fewer properties than the required number of {0}",
						schema.minProperties
					)
				})
			}
		}

		if (schema.dependencies) {
			Object.keys(schema.dependencies).forEach((key: string) => {
				const prop = seenKeys[key]
				if (prop) {
					const propertyDep = schema.dependencies[key]
					if (Array.isArray(propertyDep)) {
						propertyDep.forEach((requiredProp: string) => {
							if (!seenKeys[requiredProp]) {
								validationResult.problems.push({
									location: {
										start: this.start,
										end: this.end
									},
									severity: ProblemSeverity.Warning,
									message: localize(
										"RequiredDependentPropWarning",
										"Object is missing property {0} required by property {1}.",
										requiredProp,
										key
									)
								})
							} else {
								validationResult.propertiesValueMatches++
							}
						})
					} else if (propertyDep) {
						const propertyvalidationResult = new ValidationResult()
						this.validate(
							propertyDep,
							propertyvalidationResult,
							matchingSchemas
						)
						validationResult.mergePropertyMatch(
							propertyvalidationResult
						)
					}
				}
			})
		}
	}
}
