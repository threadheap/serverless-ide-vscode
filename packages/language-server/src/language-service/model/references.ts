import { ASTNode } from "./../parser/json"

export enum ReferenceType {
	BASE64 = "BASE64",
	CIDR = "CIDR",
	// conditions
	AND = "AND",
	IF = "IF",
	NOT = "NOT",
	OR = "OR",
	EQUALS = "EQUALS",
	// getters
	FIND_IN_MAP = "FIND_IN_MAP",
	GET_ATT = "GET_ATT",
	GET_AZS = "GET_AZS",
	IMPORT_VALUE = "IMPORT_VALUE",
	// transformers
	JOIN = "JOIN",
	SELECT = "SELECT",
	SPLIT = "SPLIT",
	SUB = "SUB",
	TRANSFORM = "TRANSFORM",
	// ref/sub
	REF = "REF",
	// depends on
	DEPENDS_ON = "DEPENDS_ON"
}

export enum ReferenceTag {
	REF = "!Ref",
	SUB = "!Sub",
	GET_ATT = "!GetAtt",
	IF = "!If",
	DEPENDS_ON = "!DependsOn",
	FIND_IN_MAP = "!FindInMap"
}

export enum ReferenceTagToType {
	"!Ref" = ReferenceType.REF,
	"!Sub" = ReferenceType.SUB,
	"!GetAtt" = ReferenceType.GET_ATT,
	"!If" = ReferenceType.IF,
	"!DependsOn" = ReferenceType.DEPENDS_ON,
	"!FindInMap" = ReferenceType.FIND_IN_MAP
}

export interface Reference {
	type: ReferenceType
	key: string
	node: ASTNode
	offset: number
}

export const getReferenceTypeFromTag = (tag: ReferenceTag): ReferenceType => {
	return ReferenceTagToType[tag] as any
}
