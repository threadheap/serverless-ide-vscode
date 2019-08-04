import { ResourcesDefinitions } from "../model/resources"
import { SortedHash } from "../model/sortedHash"
import { ASTNode, ObjectASTNode, PropertyASTNode, StringASTNode } from "./json"
import { findProperty, getPropertyNodeValue } from "./util"

const RESOURCES_KEY = "Resources"

const getResourceType = (propertyObjectNode: ObjectASTNode): string | void => {
	const typePropertyNode = propertyObjectNode
		.getChildNodes()
		.find((node: ASTNode) => {
			return (
				node.type === "property" &&
				(node as PropertyASTNode).key.location === "Type"
			)
		}) as PropertyASTNode | void

	if (typePropertyNode) {
		const value = typePropertyNode.value

		if (value && value.type === "string") {
			const stringNode = value as StringASTNode

			if (stringNode.value && stringNode.value.startsWith("AWS::")) {
				return stringNode.value
			}
		}
	}
}

const collectResourcesFromNode = (
	resourcesNode: ObjectASTNode,
	resourcesHash: ResourcesDefinitions
): ResourcesDefinitions => {
	resourcesNode.getChildNodes().forEach(node => {
		if (node.type === "property") {
			const propertyNode = node as PropertyASTNode
			const key = String(propertyNode.key.location)
			let resourceType: string | void
			const existingResource = resourcesHash.get(key)

			const propertyObjectNode = getPropertyNodeValue(
				propertyNode,
				String(key)
			)

			if (propertyObjectNode) {
				resourceType = getResourceType(propertyObjectNode)
			}

			if (
				!existingResource ||
				(!existingResource.resourceType && resourceType)
			) {
				if (existingResource) {
					resourcesHash.remove(key)
				}

				resourcesHash.add(key, {
					id: key,
					resourceType
				})
			}
		}
	})

	return resourcesHash
}

export const collectResources = (
	rootNode: ASTNode | void
): ResourcesDefinitions => {
	const resourcesHash: ResourcesDefinitions = new SortedHash()

	if (!rootNode) {
		return resourcesHash
	}

	if (rootNode.type === "object") {
		const globalsNode = getPropertyNodeValue(
			findProperty(
				rootNode as ObjectASTNode,
				node => node.key.location === RESOURCES_KEY
			),
			RESOURCES_KEY
		)

		if (typeof globalsNode !== "undefined") {
			return collectResourcesFromNode(globalsNode, resourcesHash)
		}
	}

	return resourcesHash
}
