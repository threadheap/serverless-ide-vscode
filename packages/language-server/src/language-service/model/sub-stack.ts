import { PropertyASTNode, StringASTNode } from "../parser/json"

export interface SubStack {
	path: string
	uri: string | void
	node: PropertyASTNode
	templateUrlNode: StringASTNode
}
