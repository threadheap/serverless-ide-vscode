import { PropertyASTNode } from "../parser/json"
import { ReferenceEntityType } from "./references"

export interface Referenceable {
	id: string
	node: PropertyASTNode
	entityType: ReferenceEntityType
}

export interface ReferenceablesHash {
	[key: string]: Referenceable
}

export type ReferenceableLookup = WeakMap<PropertyASTNode, Referenceable>

export interface Referenceables {
	hash: {
		[key in ReferenceEntityType]: ReferenceablesHash
	}
	lookup: ReferenceableLookup
}
