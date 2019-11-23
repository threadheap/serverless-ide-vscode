import { Reference, ReferenceType } from "../../model/references"
import { StringASTNode } from "../json/string-ast-node"

const parameterRegExp = new RegExp("\\${[^}]*}", "g")

const REST_API_RESOURCE = "ServerlessRestApi"

const isValidKey = (key: string) =>
	!key.startsWith("AWS::") && key !== REST_API_RESOURCE

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
		if (isValidKey(referencedKey)) {
			const reference = {
				key: referencedKey,
				type: ReferenceType.SUB,
				node
			}
			references.push(reference)
		}
	}
	return references
}

export const getRef = (node: StringASTNode): Reference[] => {
	const referencedKey = node.value

	if (isValidKey(referencedKey)) {
		const reference = {
			key: referencedKey,
			type: ReferenceType.REF,
			node
		}
		return [reference]
	}
	return []
}

export const getGetAtt = (node: StringASTNode): Reference[] => {
	// TODO: handle reference properties
	const [referencedKey] = node.value.split(".")

	if (isValidKey(referencedKey)) {
		return [
			{
				key: referencedKey,
				type: ReferenceType.GET_ATT,
				node
			}
		]
	}

	return []
}

export const getDependsOn = (node: StringASTNode): Reference[] => {
	const referencedKey = node.value
	if (isValidKey(referencedKey)) {
		return [
			{
				key: referencedKey,
				type: ReferenceType.DEPENDS_ON,
				node
			}
		]
	}
	return []
}

export const getCondition = (node: StringASTNode): Reference[] => {
	const referencedCondition = node.value

	return [
		{
			key: referencedCondition,
			type: ReferenceType.CONDITION,
			node
		}
	]
}
