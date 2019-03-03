import { ObjectASTNode, PropertyASTNode } from "./jsonParser"

export const findProperty = (
	objectNode: ObjectASTNode | void,
	predicate: (node: PropertyASTNode) => boolean
): PropertyASTNode | void => {
	if (!objectNode) {
		return
	}
	return objectNode.getChildNodes().find(node => {
		return node.type === "property" && predicate(node as PropertyASTNode)
	}) as PropertyASTNode | void
}

export const getPropertyNodeValue = (
	propertyNode: PropertyASTNode | void,
	location: string
): ObjectASTNode | void => {
	if (!propertyNode) {
		return
	}

	return propertyNode.getChildNodes().find(node => {
		return node.type === "object" && node.location === location
	}) as ObjectASTNode | void
}
