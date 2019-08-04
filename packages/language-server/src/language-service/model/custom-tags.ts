import { ReferenceType } from "./references"

export type TagKind = "sequence" | "scalar" | "mapping"

export interface CustomTag {
	type: ReferenceType
	tag: string
	kind: TagKind
	propertyName: string
}

export const CUSTOM_TAGS: CustomTag[] = [
	{
		type: ReferenceType.BASE64,
		tag: "!Base64",
		kind: "sequence",
		propertyName: "Fn::Base64"
	},
	{
		type: ReferenceType.CIDR,
		tag: "!Cidr",
		kind: "sequence",
		propertyName: "Fn::Cidr"
	},
	// logical
	{
		type: ReferenceType.AND,
		tag: "!And",
		kind: "sequence",
		propertyName: "Fn::And"
	},
	{
		type: ReferenceType.IF,
		tag: "!If",
		kind: "sequence",
		propertyName: "Fn::If"
	},
	{
		type: ReferenceType.NOT,
		tag: "!Not",
		kind: "sequence",
		propertyName: "Fn::Not"
	},
	{
		type: ReferenceType.OR,
		tag: "!Or",
		kind: "sequence",
		propertyName: "Fn::Or"
	},
	{
		type: ReferenceType.EQUALS,
		tag: "!Equals",
		kind: "sequence",
		propertyName: "Fn::Equals"
	},
	// getters
	{
		type: ReferenceType.FIND_IN_MAP,
		tag: "!FindInMap",
		kind: "sequence",
		propertyName: "Fn::FindInMap"
	},
	{
		type: ReferenceType.GET_ATT,
		tag: "!GetAtt",
		kind: "scalar",
		propertyName: "Fn::GetAtt"
	},
	{
		type: ReferenceType.GET_AZS,
		tag: "!GetAZs",
		kind: "scalar",
		propertyName: "Fn::GetAZs"
	},
	{
		type: ReferenceType.IMPORT_VALUE,
		tag: "!ImportValue",
		kind: "mapping",
		propertyName: "Fn::ImportValue"
	},
	{
		type: ReferenceType.JOIN,
		tag: "!Join",
		kind: "sequence",
		propertyName: "Fn::Join"
	},
	{
		type: ReferenceType.SELECT,
		tag: "!Select",
		kind: "sequence",
		propertyName: "Fn::Select"
	},
	{
		type: ReferenceType.SPLIT,
		tag: "!Split",
		kind: "sequence",
		propertyName: "Fn::Split"
	},
	{
		type: ReferenceType.SUB,
		tag: "!Sub",
		kind: "sequence",
		propertyName: "Fn::Sub"
	},
	{
		type: ReferenceType.TRANSFORM,
		tag: "!Transform",
		kind: "mapping",
		propertyName: "Fn::Transform"
	},
	// ref
	{
		type: ReferenceType.REF,
		tag: "!Ref",
		kind: "scalar",
		propertyName: "Ref"
	}
]
