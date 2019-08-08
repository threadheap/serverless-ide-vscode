import { CLOUD_FORMATION, SERVERLESS_FRAMEWORK } from "./../../model/document"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./../../parser/json"
import { getNodeItemByKey } from "../../utils/yaml"
import { DocumentType, SAM } from "../../model/document"
import { Referenceables } from "../../model/referenceables"

const collectReferenceablesFromNode = (
	node: PropertyASTNode | void
): Referenceables => {
	const referenceables: Referenceables = {}

	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			value.properties.forEach(property => {
				const key = property.key.getValue()

				referenceables[key] = {
					node: property
				}
			})
		}
	}

	return referenceables
}

const collectCfnReferenceables = (node: ASTNode): Referenceables => {
	const nodes = [
		getNodeItemByKey(node, "Parameters"),
		getNodeItemByKey(node, "Resources")
	]

	return nodes
		.map(collectReferenceablesFromNode)
		.reduce((memo, referenceables) => {
			return Object.assign(memo, referenceables)
		}, {})
}

const collectServerlessReferenceables = (node: ASTNode): Referenceables => {
	const resourcesProperty = getNodeItemByKey(node, "resources")

	if (resourcesProperty && resourcesProperty.value instanceof ObjectASTNode) {
		const node = getNodeItemByKey(resourcesProperty.value, "Resources")

		return node ? collectReferenceablesFromNode(node) : {}
	}

	return {}
}

export const collectReferenceables = (
	documentType: DocumentType,
	node: ASTNode
): Referenceables => {
	switch (documentType) {
		case SAM:
		case CLOUD_FORMATION:
			return collectCfnReferenceables(node)
		case SERVERLESS_FRAMEWORK:
			return collectServerlessReferenceables(node)
		default:
			return {}
	}
}
