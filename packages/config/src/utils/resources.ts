import { Segment } from "vscode-json-languageservice"

import { ASTNode, PropertyASTNode } from "../parser"

export const getRelativeNodePath = (node: ASTNode): Segment[] => {
	let path = node.getPath()

	// remove leading `resources` part to support serverless framework
	if (path[0] === "resources") {
		return path.slice(1)
	}

	return path
}

export const getResourceName = (node: ASTNode): void | string => {
	const path = this.getRelativeNodePath(node)

	const getResourceName = (targetNode: ASTNode): string | void => {
		if (targetNode.type !== "object") {
			return
		}

		const children = targetNode.getChildNodes()
		let resourceType: string | void

		children.find(child => {
			if (child && child.type === "property") {
				const property = child as PropertyASTNode

				if (property.key.location === "Type") {
					const resourceTypeValue =
						property.value && property.value.value

					if (
						typeof resourceTypeValue === "string" &&
						resourceTypeValue.indexOf("AWS::") === 0
					) {
						resourceType = resourceTypeValue
						return true
					}
				}
			}

			return false
		})

		return resourceType
	}

	if (path[0] === "Resources" && path.length > 1) {
		let currentNode = node.parent
		let resourceName = getResourceName(node)
		let depth = 0
		const maxDepth = 7

		while (resourceName === undefined && currentNode && depth < maxDepth) {
			resourceName = getResourceName(currentNode)
			currentNode = currentNode.parent
			depth += 1
		}

		return resourceName
	}
}
