import { LanguageSettings } from "./../../model/settings"
import { IProblem, ValidationResult } from "./validation-result"
import { ASTNode, ISchemaCollector, IApplicableSchema } from "./ast-node"
import { JSONSchema } from "../../jsonSchema"

export { ASTNode } from "./ast-node"
export { PropertyASTNode } from "./property-ast-node"
export { StringASTNode } from "./string-ast-node"
export { NumberASTNode } from "./number-ast-node"
export { BooleanASTNode } from "./boolean-ast-node"
export { ObjectASTNode } from "./object-ast-node"
export { ArrayASTNode } from "./array-ast-node"
export { NullASTNode } from "./null-ast-node"
export { ErrorCode } from "./validation-result"

// tslint:disable-next-line: max-classes-per-file
class SchemaCollector implements ISchemaCollector {
	schemas: IApplicableSchema[] = []
	private focusOffset: number
	private exclude: ASTNode
	constructor(focusOffset: number = -1, exclude: ASTNode = null) {
		this.focusOffset = focusOffset
		this.exclude = exclude
	}
	add(schema: IApplicableSchema) {
		this.schemas.push(schema)
	}
	merge(other: ISchemaCollector) {
		this.schemas.push(...other.schemas)
	}
	include(node: ASTNode) {
		return (
			(this.focusOffset === -1 || node.contains(this.focusOffset)) &&
			node !== this.exclude
		)
	}
	newSub(): ISchemaCollector {
		return new SchemaCollector(-1, this.exclude)
	}
}

// tslint:disable-next-line: max-classes-per-file
class NoOpSchemaCollector implements ISchemaCollector {
	get schemas() {
		return []
	}
	add() {
		return
	}
	merge() {
		return
	}
	include() {
		return true
	}
	newSub(): ISchemaCollector {
		return this
	}
}

// tslint:disable-next-line: max-classes-per-file

// tslint:disable-next-line: max-classes-per-file
export class JSONDocument {
	readonly root: ASTNode
	readonly syntaxErrors: IProblem[]

	constructor(root: ASTNode, syntaxErrors: IProblem[]) {
		this.root = root
		this.syntaxErrors = syntaxErrors
	}

	getNodeFromOffset(offset: number): ASTNode {
		return this.root && this.root.getNodeFromOffset(offset)
	}

	getNodeFromOffsetEndInclusive(offset: number): ASTNode {
		return this.root && this.root.getNodeFromOffsetEndInclusive(offset)
	}

	visit(visitor: (node: ASTNode) => boolean): void {
		if (this.root) {
			this.root.visit(visitor)
		}
	}

	configureSettings(parserSettings: LanguageSettings) {
		if (this.root) {
			this.root.setParserSettings(parserSettings)
		}
	}

	validate(schema: JSONSchema): IProblem[] {
		if (this.root && schema) {
			const validationResult = new ValidationResult()
			this.root.validate(
				schema,
				validationResult,
				new NoOpSchemaCollector()
			)
			return validationResult.problems
		}
		return null
	}

	getMatchingSchemas(
		schema: JSONSchema,
		focusOffset: number = -1,
		exclude: ASTNode = null
	): IApplicableSchema[] {
		const matchingSchemas = new SchemaCollector(focusOffset, exclude)
		const validationResult = new ValidationResult()
		if (this.root && schema) {
			this.root.validate(schema, validationResult, matchingSchemas)
		}
		return matchingSchemas.schemas
	}

	getValidationProblems(
		schema: JSONSchema,
		focusOffset: number = -1,
		exclude: ASTNode = null
	) {
		const matchingSchemas = new SchemaCollector(focusOffset, exclude)
		const validationResult = new ValidationResult()
		if (this.root && schema) {
			this.root.validate(schema, validationResult, matchingSchemas)
		}
		return validationResult.problems
	}
}
