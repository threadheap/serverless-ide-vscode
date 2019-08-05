import { ReferenceType } from "./references"

export type TagKind = "sequence" | "scalar" | "mapping"

export interface CustomTag {
	type?: ReferenceType
	tag: string
	kind: TagKind
	propertyName: string
}

export const CUSTOM_TAGS: CustomTag[] = [
	{
		tag: "!Base64",
		kind: "sequence",
		propertyName: "Fn::Base64"
	},
	{
		tag: "!Cidr",
		kind: "sequence",
		propertyName: "Fn::Cidr"
	},
	// logical
	{
		tag: "!And",
		kind: "sequence",
		propertyName: "Fn::And"
	},
	{
		tag: "!If",
		kind: "sequence",
		propertyName: "Fn::If"
	},
	{
		tag: "!Not",
		kind: "sequence",
		propertyName: "Fn::Not"
	},
	{
		tag: "!Or",
		kind: "sequence",
		propertyName: "Fn::Or"
	},
	{
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
		tag: "!GetAZs",
		kind: "scalar",
		propertyName: "Fn::GetAZs"
	},
	{
		tag: "!ImportValue",
		kind: "mapping",
		propertyName: "Fn::ImportValue"
	},
	{
		tag: "!Join",
		kind: "sequence",
		propertyName: "Fn::Join"
	},
	{
		tag: "!Select",
		kind: "sequence",
		propertyName: "Fn::Select"
	},
	{
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
	},
	{
		type: ReferenceType.DEPENDS_ON,
		tag: "",
		kind: "sequence",
		propertyName: "DependsOn"
	}
]
