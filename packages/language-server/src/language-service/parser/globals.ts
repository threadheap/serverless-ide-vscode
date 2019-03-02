import { ASTNode, PropertyASTNode, ObjectASTNode } from './jsonParser';
import { findProperty, getPropertyNodeValue } from './util';
import {
	GlobalsConfig,
	GlobalConfigItem,
	API,
	FUNCTION,
	SIMPLE_TABLE,
	GlobalKeys
} from '../model/globals';

const GLOBALS_KEY: 'Globals' = 'Globals';

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
});

const collectGlobalPropertiesFromNode = (
	globalsNode: ObjectASTNode,
	globalsConfig: GlobalsConfig
): GlobalsConfig => {
	globalsNode.getChildNodes().forEach(node => {
		if (node.type === 'property') {
			const propertyNode = node as PropertyASTNode;
			const location = propertyNode.key.location;

			if (location in globalsConfig) {
				const configItem: GlobalConfigItem = globalsConfig[location];
				const propertyObjectNode = getPropertyNodeValue(
					propertyNode,
					String(location)
				);

				if (typeof propertyObjectNode !== 'undefined') {
					propertyObjectNode.getChildNodes().forEach(childNode => {
						if (childNode.type === 'property') {
							const propertyChildNode = childNode as PropertyASTNode;

							configItem.properties.push(
								propertyChildNode.key.location
							);
						}
					});
				}
			}
		}
	});

	return globalsConfig;
};

export const collectGlobals = (rootNode: ASTNode): GlobalsConfig => {
	const globalsConfig: GlobalsConfig = getDefaultGlobalsConfig();

	if (rootNode.type === 'object') {
		const globalsNode = getPropertyNodeValue(
			findProperty(
				rootNode as ObjectASTNode,
				node => node.key.location === GLOBALS_KEY
			),
			GLOBALS_KEY
		);

		if (typeof globalsNode !== 'undefined') {
			return collectGlobalPropertiesFromNode(globalsNode, globalsConfig);
		}
	}

	return globalsConfig;
};
