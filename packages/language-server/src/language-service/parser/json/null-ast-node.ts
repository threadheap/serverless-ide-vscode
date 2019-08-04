import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"

export class NullASTNode extends ASTNode {
	constructor(
		parent: ASTNode,
		name: Json.Segment,
		start: number,
		end?: number
	) {
		super(parent, "null", name, start, end)
	}

	getValue(): null {
		return null
	}
}
