import { ASTNode, IApplicableSchema, ISchemaCollector } from "./ast-node"

// tslint:disable-next-line: max-classes-per-file
export class SchemaCollector implements ISchemaCollector {
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
export class NoOpSchemaCollector implements ISchemaCollector {
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
