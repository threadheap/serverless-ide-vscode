import {
	API,
	FUNCTION,
	GlobalConfigItem,
	GlobalKeys,
	GlobalsConfig,
	SIMPLE_TABLE
} from "../model/globals"
import { ASTNode, ObjectASTNode, PropertyASTNode } from "./jsonParser"
import { findProperty, getPropertyNodeValue } from "./util"

const GLOBALS_KEY: "Globals" = "Globals"

export const getDefaultGlobalsConfig = (): GlobalsConfig => ({
	[API]: {
		...GlobalKeys[API],
		properties: []
	},
	[FUNCTION]: {
		...GlobalKeys[FUNCTION],
		properties: []
	},
	[SIMPLE_TABLE]: {
		...GlobalKeys[SIMPLE_TABLE],
		properties: []
	}
})

const collectGlobalPropertiesFromNode = (
	globalsNode: ObjectASTNode,
	globalsConfig: GlobalsConfig
): GlobalsConfig => {
	globalsNode.getChildNodes().forEach(node => {
		if (node.type === "property") {
			const propertyNode = node as PropertyASTNode
			const location = propertyNode.key.location

			if (location in globalsConfig) {
				const configItem: GlobalConfigItem = globalsConfig[location]
				const propertyObjectNode = getPropertyNodeValue(
					propertyNode,
					String(location)
				)

				if (typeof propertyObjectNode !== "undefined") {
					propertyObjectNode.getChildNodes().forEach(childNode => {
						if (childNode.type === "property") {
							const propertyChildNode = childNode as PropertyASTNode

							configItem.properties.push(
								propertyChildNode.key.location
							)
						}
					})
				}
			}
		}
	})

	return globalsConfig
}

export const collectGlobals = (rootNode: ASTNode | void): GlobalsConfig => {
	const globalsConfig: GlobalsConfig = getDefaultGlobalsConfig()

	if (!rootNode) {
		return
	}

	if (rootNode.type === "object") {
		const globalsNode = getPropertyNodeValue(
			findProperty(
				rootNode as ObjectASTNode,
				node => node.key.location === GLOBALS_KEY
			),
			GLOBALS_KEY
		)

		if (typeof globalsNode !== "undefined") {
			return collectGlobalPropertiesFromNode(globalsNode, globalsConfig)
		}
	}

	return globalsConfig
}
