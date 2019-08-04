import { CustomTag } from "./../../model/custom-tags"
import { Reference, ReferenceType } from "../../model/references"
import { StringASTNode } from "../json/string-ast-node"

const parameterRegExp = new RegExp("\\${[^}]*}", "g")

export const getSub = (
	node: StringASTNode,
	customTag: CustomTag
): Reference[] => {
	// rest regexp
	parameterRegExp.lastIndex = 0

	let match: RegExpExecArray
	const references: Reference[] = []
	while (
		(match = parameterRegExp.exec(node.value) as RegExpExecArray) != null
	) {
		// Trim the ${} off of the match
		const referencedKey = match[0].substring(2, match[0].length - 1)
		// skip AWS variables references
		if (!referencedKey.startsWith("AWS::")) {
			const reference = {
				key: referencedKey,
				type: ReferenceType.SUB,
				offset: node.start + customTag.tag.length + match.index,
				node
			}
			references.push(reference)
		}
	}
	return references
}

export const getRef = (
	node: StringASTNode,
	customTag: CustomTag
): Reference[] => {
	const referencedKey = node.value

	if (!referencedKey.startsWith("AWS::")) {
		const reference = {
			key: referencedKey,
			type: ReferenceType.REF,
			offset: node.start + customTag.tag.length,
			node
		}
		return [reference]
	}
	return []
}

export const getGetAtt = (
	node: StringASTNode,
	customTag: CustomTag
): Reference[] => {
	// TODO: handle reference properties
	const [referencedKey] = node.value.split(".")

	return [
		{
			key: referencedKey,
			type: ReferenceType.GET_ATT,
			offset: node.start + customTag.tag.length,
			node
		}
	]
}

export const getIfFindInMapDependsOn = (
	node: StringASTNode,
	referenceType: ReferenceType
): Reference[] => {
	const referencedKey = node.value
	if (!referencedKey.startsWith("AWS::")) {
		return [
			{
				key: referencedKey,
				type: referenceType,
				offset: node.start,
				node
			}
		]
	}
	return []
}
