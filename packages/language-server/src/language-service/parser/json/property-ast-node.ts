import { CustomTag } from "./../../model/custom-tags"
import { StringASTNode } from "./string-ast-node"
import { ASTNode, ISchemaCollector } from "./ast-node"
import { JSONSchema } from "../../jsonSchema"
import { ValidationResult } from "./validation-result"

export class PropertyASTNode extends ASTNode {
	key: StringASTNode
	value: ASTNode
	colonOffset: number

	constructor(parent: ASTNode, key: StringASTNode, customTag: CustomTag) {
		super(parent, "property", null, key.start, key.end, customTag)
		this.key = key
		key.parent = this
		key.location = key.value
		this.colonOffset = -1
	}

	getChildNodes(): ASTNode[] {
		return this.value ? [this.key, this.value] : [this.key]
	}

	getLastChild(): ASTNode {
		return this.value
	}

	setValue(value: ASTNode): boolean {
		this.value = value
		return value !== null
	}

	visit(visitor: (node: ASTNode) => boolean): boolean {
		return (
			visitor(this) &&
			this.key.visit(visitor) &&
			this.value &&
			this.value.visit(visitor)
		)
	}

	validate(
		schema: JSONSchema,
		validationResult: ValidationResult,
		matchingSchemas: ISchemaCollector
	): void {
		if (!matchingSchemas.include(this)) {
			return
		}
		if (this.value) {
			this.value.validate(schema, validationResult, matchingSchemas)
		}
	}
}
