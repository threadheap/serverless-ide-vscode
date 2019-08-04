import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"

export class BooleanASTNode extends ASTNode {
	private value: boolean | string

	constructor(
		parent: ASTNode,
		name: Json.Segment,
		value: boolean | string,
		start: number,
		end?: number
	) {
		super(parent, "boolean", name, start, end)
		this.value = value
	}

	getValue(): boolean | string {
		return this.value
	}
}
