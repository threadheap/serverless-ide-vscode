import * as Json from "jsonc-parser"

import { YAMLDocument } from "../index"
import { ASTNode } from "./ast-node"

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
