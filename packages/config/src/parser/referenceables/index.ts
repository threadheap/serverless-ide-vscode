import {
	DocumentType,
	Referenceable,
	Referenceables,
	ReferenceEntityType,
	SortedHash
} from "../../model"
import { getNodeItemByKey } from "../../utils/yaml"
import { ASTNode, ObjectASTNode, PropertyASTNode, StringASTNode } from "../json"

export const generateEmptyReferenceables = (): Referenceables => ({
	hash: {
		[ReferenceEntityType.PARAMETER]: new SortedHash(),
		[ReferenceEntityType.RESOURCE]: new SortedHash(),
		[ReferenceEntityType.MAPPING]: new SortedHash(),
		[ReferenceEntityType.OUTPUT]: new SortedHash(),
		[ReferenceEntityType.CONDITION]: new SortedHash()
	},
	lookup: new WeakMap()
})

const addReferenceable = (
	referenceables: Referenceables,
	entityType: ReferenceEntityType,
	referenceable: Referenceable
) => {
	referenceables.hash[entityType].add(referenceable.id, referenceable)
	referenceables.lookup.set(referenceable.node, referenceable)
}

const getResourceType = (resourceNode: ASTNode): string | void => {
	if (resourceNode) {
		const resourceValue = resourceNode.get(["Type"])

		if (resourceValue instanceof StringASTNode) {
			return resourceValue.value
		}
	}
}

const collectReferenceablesFromNode = (
	entityType: ReferenceEntityType,
	node: PropertyASTNode | void,
	referenceables: Referenceables,
	isSam: boolean = false
): Referenceables => {
	if (node) {
		const { value } = node
		if (value instanceof ObjectASTNode) {
			value.properties.forEach(property => {
				const key = property.key.value
				const resourceName =
					entityType === ReferenceEntityType.RESOURCE
						? getResourceType(property.value)
						: undefined

				const referenceable = {
					id: key,
					node: property,
					entityType,
					resourceName
				}

				addReferenceable(referenceables, entityType, referenceable)

				if (isSam && resourceName === "AWS::Serverless::Function") {
					const roleReferenceable = {
						id: `${key}Role`,
						node: property,
						entityType,
						resourceName: "AWS::IAM::Role"
					}

					// we don't need to add the role into lookup hash
					referenceables.hash[entityType].add(
						roleReferenceable.id,
						roleReferenceable
					)
				}
			})
		}
	}

	return referenceables
}

const collectCfnReferenceables = (
	node: ASTNode,
	isSam: boolean = false
): Referenceables => {
	const referenceables = generateEmptyReferenceables()

	collectReferenceablesFromNode(
		ReferenceEntityType.PARAMETER,
		getNodeItemByKey(node, "Parameters"),
		referenceables
	)

	collectReferenceablesFromNode(
		ReferenceEntityType.RESOURCE,
		getNodeItemByKey(node, "Resources"),
		referenceables,
		isSam
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

	collectReferenceablesFromNode(
		ReferenceEntityType.CONDITION,
		getNodeItemByKey(node, "Conditions"),
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
		case DocumentType.SAM:
			return collectCfnReferenceables(node, true)
		case DocumentType.CLOUD_FORMATION:
			return collectCfnReferenceables(node)
		case DocumentType.SERVERLESS_FRAMEWORK:
			return collectServerlessReferenceables(node)
		default:
			return generateEmptyReferenceables()
	}
}
