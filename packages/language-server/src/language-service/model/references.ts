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
	DEPENDS_ON = "DEPENDS_ON"
}

export interface Reference {
	type: ReferenceType
	key: string
	node: ASTNode
	offset: number
}
