import { CLOUD_FORMATION, SERVERLESS_FRAMEWORK } from "./../../model/document"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./../../parser/json"
import { getNodeItemByKey } from "../../utils/yaml"
import { DocumentType, SAM } from "../../model/document"
import {
	Referenceables,
	ReferenceablesHash,
	ReferenceableLookup
} from "../../model/referenceables"
import { ReferenceEntityType } from "../../model/references"

export const generateEmptyReferenceables = (): Referenceables => ({
	hash: {
		[ReferenceEntityType.PARAMETER]: {},
		[ReferenceEntityType.RESOURCE]: {},
		[ReferenceEntityType.MAPPING]: {},
		[ReferenceEntityType.OUTPUT]: {}
	},
	lookup: new WeakMap()
})

const collectReferenceablesFromNode = (
	entityType: ReferenceEntityType,
	node: PropertyASTNode | void,
	lookup: ReferenceableLookup
): ReferenceablesHash => {
	const referenceables: ReferenceablesHash = {}

	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			value.properties.forEach(property => {
				const key = property.key.value

				referenceables[key] = {
					id: key,
					node: property,
					entityType
				}
				lookup.set(property, referenceables[key])
			})
		}
	}

	return referenceables
}

const collectCfnReferenceables = (node: ASTNode): Referenceables => {
	const referenceables = generateEmptyReferenceables()

	referenceables.hash = {
		[ReferenceEntityType.PARAMETER]: collectReferenceablesFromNode(
			ReferenceEntityType.PARAMETER,
			getNodeItemByKey(node, "Parameters"),
			referenceables.lookup
		),
		[ReferenceEntityType.RESOURCE]: collectReferenceablesFromNode(
			ReferenceEntityType.RESOURCE,
			getNodeItemByKey(node, "Resources"),
			referenceables.lookup
		),
		[ReferenceEntityType.MAPPING]: collectReferenceablesFromNode(
			ReferenceEntityType.MAPPING,
			getNodeItemByKey(node, "Mappings"),
			referenceables.lookup
		),
		[ReferenceEntityType.OUTPUT]: collectReferenceablesFromNode(
			ReferenceEntityType.OUTPUT,
			getNodeItemByKey(node, "Output"),
			referenceables.lookup
		)
	}

	return referenceables
}

const collectServerlessReferenceables = (node: ASTNode): Referenceables => {
	const referenceables = generateEmptyReferenceables()
	const resourcesProperty = getNodeItemByKey(node, "resources")

	if (resourcesProperty && resourcesProperty.value instanceof ObjectASTNode) {
		const node = getNodeItemByKey(resourcesProperty.value, "Resources")

		if (node) {
			referenceables.hash[
				ReferenceEntityType.RESOURCE
			] = collectReferenceablesFromNode(
				ReferenceEntityType.RESOURCE,
				node,
				referenceables.lookup
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
