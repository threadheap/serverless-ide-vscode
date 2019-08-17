import { PropertyASTNode } from "../parser/json"
import { ReferenceEntityType } from "./references"

export interface Referenceable {
	node: PropertyASTNode
}

export interface ReferenceablesHash {
	[key: string]: Referenceable
}

export type Referenceables = {
	[key in ReferenceEntityType]: ReferenceablesHash
}
