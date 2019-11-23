import {
	CUSTOM_TAGS,
	CustomTag,
	Reference,
	References,
	ReferenceType
} from "../../model"
import { ArrayASTNode } from "../json/array-ast-node"
import { ASTNode } from "../json/ast-node"
import { ObjectASTNode } from "../json/object-ast-node"
import { StringASTNode } from "../json/string-ast-node"
import * as utils from "./utils"
import keyBy = require("lodash/keyBy")
import { PropertyASTNode } from "../json"

const CUSTOM_TAGS_BY_PROPERTY_NAME = keyBy(CUSTOM_TAGS, "propertyName")

export const generateEmptyReferences = (): References => ({
	hash: {},
	lookup: new WeakMap()
})

export const collectReferencesFromStringNode = (
	node: StringASTNode,
	customTag: CustomTag
): Reference[] => {
	switch (customTag.type) {
		case ReferenceType.GET_ATT:
			return utils.getGetAtt(node)
		case ReferenceType.REF:
			return utils.getRef(node)
		case ReferenceType.SUB:
			return utils.getSub(node)
		case ReferenceType.DEPENDS_ON:
			return utils.getDependsOn(node)
		case ReferenceType.CONDITION:
			return utils.getCondition(node)
		default:
			return []
	}
}

export const collectReferences = (node: ASTNode): References => {
	const references = generateEmptyReferences()

	const addToReferences = (item: Reference) => {
		if (!references.hash[item.key]) {
			references.hash[item.key] = [item]
		} else {
			references.hash[item.key].push(item)
		}
		references.lookup.set(item.node, item)
	}

	const traverse = (node: ASTNode, customTag?: CustomTag) => {
		let currentCustomTag = customTag

		if (node.customTag && node.customTag.type !== undefined) {
			currentCustomTag = node.customTag
		}

		if (node instanceof StringASTNode) {
			if (currentCustomTag) {
				collectReferencesFromStringNode(node, currentCustomTag).forEach(
					addToReferences
				)
			}
		} else if (node instanceof ArrayASTNode) {
			if (
				currentCustomTag &&
				currentCustomTag.type === ReferenceType.SUB
			) {
				if (node.items.length === 1) {
					const firstItem = node.items[0]

					if (firstItem instanceof StringASTNode) {
						utils.getSub(firstItem).forEach(addToReferences)
					}
				} else {
					node.items.slice(1).forEach(item => {
						traverse(item, currentCustomTag)
					})
				}
			} else if (
				currentCustomTag &&
				currentCustomTag.type === ReferenceType.GET_ATT
			) {
				const firstItem = node.items[0]

				if (firstItem instanceof StringASTNode) {
					utils.getGetAtt(firstItem).forEach(addToReferences)
				}
			} else {
				node.items.forEach(item => {
					traverse(item, currentCustomTag)
				})
			}
		} else if (node instanceof ObjectASTNode) {
			node.properties.forEach(item => {
				traverse(item, currentCustomTag)
			})
		} else if (node instanceof PropertyASTNode) {
			if (node.key.value in CUSTOM_TAGS_BY_PROPERTY_NAME) {
				currentCustomTag = CUSTOM_TAGS_BY_PROPERTY_NAME[node.key.value]
			}

			traverse(node.value, currentCustomTag)
		}
	}

	traverse(node)

	return references
}
