import { JSONSchema } from "./../../jsonSchema"
import { LanguageSettings } from "./../../model/settings"
import { ASTNode, IApplicableSchema } from "./ast-node"
import { IProblem, ValidationResult } from "./validation-result"
import { NoOpSchemaCollector, SchemaCollector } from "./schema-collector"

export class JSONDocument {
	readonly uri: string
	readonly root: ASTNode
	readonly syntaxErrors: IProblem[]

	constructor(uri: string, root: ASTNode, syntaxErrors: IProblem[]) {
		this.uri = uri
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

	async validate(schema: JSONSchema): Promise<IProblem[]> {
		if (this.root && schema) {
			const validationResult = new ValidationResult()
			await this.root.validate(
				schema,
				validationResult,
				new NoOpSchemaCollector()
			)
			return validationResult.problems
		}
		return null
	}

	async getValidationProblems(
		schema: JSONSchema,
		focusOffset: number = -1,
		exclude: ASTNode = null
	): Promise<IProblem[]> {
		const matchingSchemas = new SchemaCollector(focusOffset, exclude)
		const validationResult = new ValidationResult()
		if (this.root && schema) {
			await this.root.validate(schema, validationResult, matchingSchemas)
		}
		return validationResult.problems
	}

	async getMatchingSchemas(
		schema: JSONSchema,
		focusOffset: number = -1,
		exclude: ASTNode = null
	): Promise<IApplicableSchema[]> {
		const matchingSchemas = new SchemaCollector(focusOffset, exclude)
		const validationResult = new ValidationResult()
		if (this.root && schema) {
			await this.root.validate(schema, validationResult, matchingSchemas)
		}
		return matchingSchemas.schemas
	}
}
