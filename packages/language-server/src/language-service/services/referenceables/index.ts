import { CLOUD_FORMATION, SERVERLESS_FRAMEWORK } from "./../../model/document"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./../../parser/json"
import { getNodeItemByKey } from "../../utils/yaml"
import flatten = require("lodash/flatten")
import { DocumentType, SAM } from "../../model/document"

const collectNodeKeys = (node: PropertyASTNode | void): string[] => {
	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			return value.properties.map(property => property.key.getValue())
		}
	}
	return []
}

const collectCfnReferenceables = (node: ASTNode): string[] => {
	const nodes = [
		getNodeItemByKey(node, "Parameters"),
		getNodeItemByKey(node, "Resources")
	]

	return flatten(nodes.map(collectNodeKeys))
}

const collectServerlessReferenceables = (node: ASTNode): string[] => {
	const resourcesProperty = getNodeItemByKey(node, "resources")

	if (resourcesProperty && resourcesProperty.value instanceof ObjectASTNode) {
		const node = getNodeItemByKey(resourcesProperty.value, "Resources")

		return node ? collectNodeKeys(node) : []
	}

	return []
}

export const collectReferenceables = (
	documentType: DocumentType,
	node: ASTNode
): string[] => {
	switch (documentType) {
		case SAM:
		case CLOUD_FORMATION:
			return collectCfnReferenceables(node)
		case SERVERLESS_FRAMEWORK:
			return collectServerlessReferenceables(node)
		default:
			return []
	}
}
