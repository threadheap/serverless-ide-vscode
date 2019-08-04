import { StringASTNode } from "../string-ast-node"
import { Reference, ReferenceType } from "../../../model/references"
import * as utils from "./utils"

export const collectRefencesFromStringNode = (
	node: StringASTNode
): Reference[] => {
	const { customTag } = node

	if (customTag) {
		switch (customTag.type) {
			case ReferenceType.IF:
			case ReferenceType.FIND_IN_MAP:
			case ReferenceType.DEPENDS_ON:
				return utils.getIfFindInMapDependsOn(node, customTag.type)
			case ReferenceType.GET_ATT:
				return utils.getGetAtt(node)
			case ReferenceType.REF:
				return utils.getRef(node)
			case ReferenceType.SUB:
				return utils.getSub(node)
			default:
				return []
		}
	}

	return []
}
