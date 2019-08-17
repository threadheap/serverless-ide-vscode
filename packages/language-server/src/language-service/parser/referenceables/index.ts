import { CLOUD_FORMATION, SERVERLESS_FRAMEWORK } from "./../../model/document"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./../../parser/json"
import { getNodeItemByKey } from "../../utils/yaml"
import { DocumentType, SAM } from "../../model/document"
import { Referenceables, ReferenceablesHash } from "../../model/referenceables"
import { ReferenceEntityType } from "../../model/references"

export const generateEmptyReferenceables = () => ({
	[ReferenceEntityType.PARAMETER]: {},
	[ReferenceEntityType.RESOURCE]: {},
	[ReferenceEntityType.MAPPING]: {},
	[ReferenceEntityType.OUTPUT]: {}
})

const collectReferenceablesFromNode = (
	node: PropertyASTNode | void
): ReferenceablesHash => {
	const referenceables: ReferenceablesHash = {}

	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			value.properties.forEach(property => {
				const key = property.key.value

				referenceables[key] = {
					node: property
				}
			})
		}
	}

	return referenceables
}

const collectCfnReferenceables = (node: ASTNode): Referenceables => {
	return {
		[ReferenceEntityType.PARAMETER]: collectReferenceablesFromNode(
			getNodeItemByKey(node, "Parameters")
		),
		[ReferenceEntityType.RESOURCE]: collectReferenceablesFromNode(
			getNodeItemByKey(node, "Resources")
		),
		[ReferenceEntityType.MAPPING]: collectReferenceablesFromNode(
			getNodeItemByKey(node, "Mappings")
		),
		[ReferenceEntityType.OUTPUT]: collectReferenceablesFromNode(
			getNodeItemByKey(node, "Output")
		)
	}
}

const collectServerlessReferenceables = (node: ASTNode): Referenceables => {
	const referenceables = generateEmptyReferenceables()
	const resourcesProperty = getNodeItemByKey(node, "resources")

	if (resourcesProperty && resourcesProperty.value instanceof ObjectASTNode) {
		const node = getNodeItemByKey(resourcesProperty.value, "Resources")

		if (node) {
			referenceables[
				ReferenceEntityType.RESOURCE
			] = collectReferenceablesFromNode(node)
		}
	}

	return referenceables
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
			return generateEmptyReferenceables()
	}
}
