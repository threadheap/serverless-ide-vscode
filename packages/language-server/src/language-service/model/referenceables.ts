import { PropertyASTNode } from "../parser/json"
import { ReferenceEntityType } from "./references"
import { SortedHash } from "./sortedHash"

export interface Referenceable {
	id: string
	node: PropertyASTNode
	entityType: ReferenceEntityType
	resourceType?: string
}

export type ReferenceableLookup = WeakMap<PropertyASTNode, Referenceable>

export interface Referenceables {
	hash: {
		[key in ReferenceEntityType]: SortedHash<Referenceable>
	}
	lookup: ReferenceableLookup
}
