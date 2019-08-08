import { PropertyASTNode } from "../parser/json"

export interface Referenceable {
	node: PropertyASTNode
}

export interface Referenceables {
	[key: string]: Referenceable
}
