import { ASTNode, ObjectASTNode, PropertyASTNode } from "../parser"

export const getNodeItemByKey = (
	node: ObjectASTNode | ASTNode,
	key: string
): PropertyASTNode | void => {
	if (node instanceof ObjectASTNode) {
		return node.properties.find(property => {
			return property.key.value === key
		}) as PropertyASTNode
	}

	return
}
