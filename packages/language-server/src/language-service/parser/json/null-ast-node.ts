import { YAMLDocument } from "./../index"
import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"

export class NullASTNode extends ASTNode<null> {
	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		start: number,
		end?: number
	) {
		super(document, parent, "null", name, start, end)
	}
}
