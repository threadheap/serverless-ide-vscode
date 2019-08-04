import { PropertyASTNode, ObjectASTNode, ASTNode } from "./../parser/json"

export const getNodeItemByKey = (
	node: ObjectASTNode | ASTNode,
	key: string
): PropertyASTNode | void => {
	if (node instanceof ObjectASTNode) {
		return node.properties.find(property => {
			return property.key.getValue() === key
		}) as PropertyASTNode
	}

	return
}
