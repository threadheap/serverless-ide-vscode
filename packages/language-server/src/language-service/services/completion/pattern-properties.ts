import { JSONSchema } from "@serverless-ide/config"
import { last, map } from "lodash"
import {
	CompletionItemKind,
	InsertTextFormat,
	MarkupKind
} from "vscode-languageserver-types"

import { CompletionsCollector } from "../../jsonContributions"
import { sendException } from "../analytics"
import documentationService from "../documentation"
import { getInsertTextForObject } from "./text"

const getResourceType = (schema: JSONSchema): string | null => {
	if (schema.properties && schema.properties.Type) {
		const typeEnum = schema.properties.Type

		if (typeEnum.enum && typeEnum.enum.length === 1) {
			return typeEnum.enum[0]
		}
	}

	return null
}

const getResourceKey = (resourceType: string): string => {
	const parts = resourceType.split("::")

	return last(parts)
}

export const addPatternPropertiesCompletions = async (
	schema: JSONSchema,
	collector: CompletionsCollector,
	separatorAfter: string,
	indent = "\t"
) => {
	await Promise.all(
		map(schema, async (propertiesSchema: JSONSchema) => {
			if (propertiesSchema.anyOf) {
				await Promise.all(
					propertiesSchema.anyOf.map(async propertySchema => {
						const resourceType = getResourceType(propertySchema)

						if (resourceType) {
							const insertText = getInsertTextForObject(
								propertySchema,
								separatorAfter,
								indent,
								2
							)

							const key = getResourceKey(resourceType)
							const text = `\${1:${key}}:\n${indent}${insertText.insertText.trimLeft()}`
							let docs: string | void = ""
							try {
								docs = await documentationService.getResourceDocumentation(
									resourceType
								)
							} catch (err) {
								sendException(err)
							}

							collector.add({
								kind: CompletionItemKind.Snippet,
								label: resourceType,
								insertText: text,
								insertTextFormat: InsertTextFormat.Snippet,
								documentation: {
									kind: MarkupKind.Markdown,
									value: docs || ""
								}
							})
						}
					})
				)
			}
		})
	)
}
