import { CLOUD_FORMATION, SERVERLESS_FRAMEWORK } from "./../../model/document"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./../../parser/json"
import { getNodeItemByKey } from "../../utils/yaml"
import { DocumentType, SAM } from "../../model/document"
import { Referenceables } from "../../model/referenceables"
import { ReferenceEntityType } from "../../model/references"
import { SortedHash } from "../../model/sortedHash"

export const generateEmptyReferenceables = (): Referenceables => ({
	hash: {
		[ReferenceEntityType.PARAMETER]: new SortedHash(),
		[ReferenceEntityType.RESOURCE]: new SortedHash(),
		[ReferenceEntityType.MAPPING]: new SortedHash(),
		[ReferenceEntityType.OUTPUT]: new SortedHash()
	},
	lookup: new WeakMap()
})

const collectReferenceablesFromNode = (
	entityType: ReferenceEntityType,
	node: PropertyASTNode | void,
	referenceables: Referenceables
): Referenceables => {
	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			value.properties.forEach(property => {
				const key = property.key.value
				const referenceable = {
					id: key,
					node: property,
					entityType
				}

				referenceables.hash[entityType].add(key, referenceable)
				referenceables.lookup.set(property, referenceable)
			})
		}
	}

	return referenceables
}

const collectCfnReferenceables = (node: ASTNode): Referenceables => {
	const referenceables = generateEmptyReferenceables()

	collectReferenceablesFromNode(
		ReferenceEntityType.PARAMETER,
		getNodeItemByKey(node, "Parameters"),
		referenceables
	)

	collectReferenceablesFromNode(
		ReferenceEntityType.RESOURCE,
		getNodeItemByKey(node, "Resources"),
		referenceables
	)

	collectReferenceablesFromNode(
		ReferenceEntityType.MAPPING,
		getNodeItemByKey(node, "Mappings"),
		referenceables
	)

	collectReferenceablesFromNode(
		ReferenceEntityType.OUTPUT,
		getNodeItemByKey(node, "Output"),
		referenceables
	)

	return referenceables
}

const collectServerlessReferenceables = (node: ASTNode): Referenceables => {
	const referenceables = generateEmptyReferenceables()
	const resourcesProperty = getNodeItemByKey(node, "resources")

	if (resourcesProperty && resourcesProperty.value instanceof ObjectASTNode) {
		const node = getNodeItemByKey(resourcesProperty.value, "Resources")

		if (node) {
			collectReferenceablesFromNode(
				ReferenceEntityType.RESOURCE,
				node,
				referenceables
			)
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
