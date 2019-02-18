import {
	CompletionItemKind,
	InsertTextFormat
} from 'vscode-languageserver-types';
import { CompletionsCollector } from '../../jsonContributions';
import { JSONSchema } from '../../jsonSchema';
import { forEach, last } from 'lodash';
import { getInsertTextForObject } from './text';

const getResourceType = (schema: JSONSchema): string | null => {
	if (schema.properties && schema.properties.Type) {
		const typeEnum = schema.properties.Type;

		if (typeEnum.enum && typeEnum.enum.length === 1) {
			return typeEnum.enum[0];
		}
	}

	return null;
};

const getResourceKey = (resourceType: string): string => {
	const parts = resourceType.split('::');

	return last(parts);
};

export const addPatternPropertiesCompletions = (
	schema: JSONSchema,
	collector: CompletionsCollector,
	separatorAfter: string,
	indent = '\t'
) => {
	forEach(schema, (propertiesSchema: JSONSchema) => {
		if (propertiesSchema.anyOf) {
			propertiesSchema.anyOf.forEach(propertySchema => {
				const resourceType = getResourceType(propertySchema);

				if (resourceType) {
					const insertText = getInsertTextForObject(
						propertySchema,
						separatorAfter,
						indent,
						2
					);

					const key = getResourceKey(resourceType);
					const text = `\${1:${key}}:\n${indent}${insertText.insertText.trimLeft()}`;

					collector.add({
						kind: CompletionItemKind.Snippet,
						label: resourceType,
						insertText: text,
						insertTextFormat: InsertTextFormat.Snippet,
						documentation: propertySchema.description || ''
					});
				}
			});
		}
	});
};
