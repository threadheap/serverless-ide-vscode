import * as Json from "jsonc-parser"

import { YAMLDocument } from "../index"
import { ASTNode } from "./ast-node"

export class BooleanASTNode extends ASTNode<string | boolean> {
	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		value: boolean | string,
		start: number,
		end?: number
	) {
		super(document, parent, "boolean", name, start, end)
		this.value = value
	}

	getValue(): boolean | string {
		return this.value
	}
}
