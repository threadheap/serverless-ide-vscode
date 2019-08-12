import { YAMLDocument } from "./../index"
import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"

export class BooleanASTNode extends ASTNode {
	private value: boolean | string

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
