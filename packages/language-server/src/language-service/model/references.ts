import { ASTNode } from "./../parser/json"

export enum ReferenceType {
	// getters
	FIND_IN_MAP = "FIND_IN_MAP",
	GET_ATT = "GET_ATT",
	// transformers
	SUB = "SUB",
	// ref/sub
	REF = "REF",
	// depends on
	DEPENDS_ON = "DEPENDS_ON",
	// conditions
	CONDITION = "CONDITION"
}

export const enum ReferenceEntityType {
	RESOURCE = "RESOURCE",
	PARAMETER = "PARAMETER",
	OUTPUT = "OUTPUT",
	MAPPING = "MAPPING",
	CONDITION = "CONDITION"
}

export interface Reference {
	type: ReferenceType
	key: string
	node: ASTNode
}

export type ReferencesLookup = WeakMap<ASTNode, Reference>

export interface References {
	hash: { [key: string]: Reference[] }
	lookup: ReferencesLookup
}
