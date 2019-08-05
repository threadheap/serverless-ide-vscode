import { Reference, ReferenceType } from "../../model/references"
import { StringASTNode } from "../json/string-ast-node"

const parameterRegExp = new RegExp("\\${[^}]*}", "g")

export const getSub = (node: StringASTNode): Reference[] => {
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
				offset: node.start + match.index,
				node
			}
			references.push(reference)
		}
	}
	return references
}

export const getRef = (node: StringASTNode): Reference[] => {
	const referencedKey = node.value

	if (!referencedKey.startsWith("AWS::")) {
		const reference = {
			key: referencedKey,
			type: ReferenceType.REF,
			offset: node.start,
			node
		}
		return [reference]
	}
	return []
}

export const getGetAtt = (node: StringASTNode): Reference[] => {
	// TODO: handle reference properties
	const [referencedKey] = node.value.split(".")

	return [
		{
			key: referencedKey,
			type: ReferenceType.GET_ATT,
			offset: node.start,
			node
		}
	]
}

export const getDependsOn = (node: StringASTNode): Reference[] => {
	const referencedKey = node.value
	if (!referencedKey.startsWith("AWS::")) {
		return [
			{
				key: referencedKey,
				type: ReferenceType.DEPENDS_ON,
				offset: node.start,
				node
			}
		]
	}
	return []
}
