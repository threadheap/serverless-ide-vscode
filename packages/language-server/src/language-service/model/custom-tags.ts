import { ReferenceType, ReferenceEntityType } from "./references"
import keyBy = require("lodash/keyBy")

export type TagKind = "sequence" | "scalar" | "mapping"

export interface CustomTag {
	type?: ReferenceType
	tag: string
	kind: TagKind
	propertyName: string
	description: string
	referenceEntityTypes: ReferenceEntityType[]
}

export const CUSTOM_TAGS: CustomTag[] = [
	{
		tag: "!Base64",
		kind: "sequence",
		propertyName: "Fn::Base64",
		description:
			"The intrinsic function Fn::Base64 returns the Base64 representation of the input string.",
		referenceEntityTypes: []
	},
	{
		tag: "!Cidr",
		kind: "sequence",
		propertyName: "Fn::Cidr",
		description:
			"The intrinsic function Fn::Cidr returns an array of CIDR address blocks.",
		referenceEntityTypes: []
	},
	// logical
	{
		tag: "!And",
		kind: "sequence",
		propertyName: "Fn::And",
		description:
			"Returns true if all the specified conditions evaluate to true, or returns false if any one of the conditions evaluates to false.",
		referenceEntityTypes: []
	},
	{
		tag: "!If",
		kind: "sequence",
		propertyName: "Fn::If",
		description:
			"Returns one value if the specified condition evaluates to true and another value if the specified condition evaluates to false.",
		referenceEntityTypes: []
	},
	{
		tag: "!Not",
		kind: "sequence",
		propertyName: "Fn::Not",
		description:
			"Returns true for a condition that evaluates to false or returns false for a condition that evaluates to true.",
		referenceEntityTypes: []
	},
	{
		tag: "!Or",
		kind: "sequence",
		propertyName: "Fn::Or",
		description:
			"Returns true if any one of the specified conditions evaluate to true, or returns false if all of the conditions evaluates to false.",
		referenceEntityTypes: []
	},
	{
		tag: "!Equals",
		kind: "sequence",
		propertyName: "Fn::Equals",
		description: "Compares if two values are equal.",
		referenceEntityTypes: []
	},
	// getters
	{
		type: ReferenceType.FIND_IN_MAP,
		tag: "!FindInMap",
		kind: "sequence",
		propertyName: "Fn::FindInMap",
		description:
			"The intrinsic function Fn::FindInMap returns the value corresponding to keys in a two-level map that is declared in the Mappings section.",
		referenceEntityTypes: [ReferenceEntityType.MAPPING]
	},
	{
		type: ReferenceType.GET_ATT,
		tag: "!GetAtt",
		kind: "scalar",
		propertyName: "Fn::GetAtt",
		description:
			"The Fn::GetAtt intrinsic function returns the value of an attribute from a resource in the template.",
		referenceEntityTypes: [ReferenceEntityType.RESOURCE]
	},
	{
		tag: "!GetAZs",
		kind: "scalar",
		propertyName: "Fn::GetAZs",
		description:
			"The intrinsic function Fn::GetAZs returns an array that lists Availability Zones for a specified region.",
		referenceEntityTypes: []
	},
	{
		tag: "!ImportValue",
		kind: "mapping",
		propertyName: "Fn::ImportValue",
		description:
			"The intrinsic function Fn::ImportValue returns the value of an output exported by another stack.",
		referenceEntityTypes: [ReferenceEntityType.OUTPUT]
	},
	{
		tag: "!Join",
		kind: "sequence",
		propertyName: "Fn::Join",
		description:
			"The intrinsic function Fn::Join appends a set of values into a single value, separated by the specified delimiter.",
		referenceEntityTypes: []
	},
	{
		tag: "!Select",
		kind: "sequence",
		propertyName: "Fn::Select",
		description:
			"The intrinsic function Fn::Select returns a single object from a list of objects by index.",
		referenceEntityTypes: []
	},
	{
		tag: "!Split",
		kind: "sequence",
		propertyName: "Fn::Split",
		description:
			"To split a string into a list of string values so that you can select an element from the resulting string list, use the Fn::Split intrinsic function.",
		referenceEntityTypes: []
	},
	{
		type: ReferenceType.SUB,
		tag: "!Sub",
		kind: "scalar",
		propertyName: "Fn::Sub",
		description:
			"The intrinsic function Fn::Sub substitutes variables in an input string with values that you specify.",
		referenceEntityTypes: [
			ReferenceEntityType.RESOURCE,
			ReferenceEntityType.PARAMETER
		]
	},
	{
		tag: "!Transform",
		kind: "mapping",
		propertyName: "Fn::Transform",
		description:
			"The intrinsic function Fn::Transform specifies a macro to perform custom processing on part of a stack template.",
		referenceEntityTypes: []
	},
	// ref
	{
		type: ReferenceType.REF,
		tag: "!Ref",
		kind: "scalar",
		propertyName: "Ref",
		description:
			"The intrinsic function Ref returns the value of the specified parameter or resource.",
		referenceEntityTypes: [
			ReferenceEntityType.PARAMETER,
			ReferenceEntityType.RESOURCE
		]
	},
	{
		type: ReferenceType.DEPENDS_ON,
		tag: "",
		kind: "sequence",
		propertyName: "DependsOn",
		description:
			"With the DependsOn attribute you can specify that the creation of a specific resource follows another.",
		referenceEntityTypes: [ReferenceEntityType.RESOURCE]
	}
]

export const CUSTOM_TAGS_BY_PROPERTY_NAME: { [key: string]: CustomTag } = keyBy(
	CUSTOM_TAGS,
	"propertyName"
)
export const CUSTOM_TAGS_BY_TYPE: { [key in ReferenceType]: CustomTag } = keyBy(
	CUSTOM_TAGS,
	"type"
)
