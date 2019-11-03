import {
	CUSTOM_TAGS,
	CustomTag,
	Referenceables,
	ReferenceType
} from "@serverless-ide/config"
import {
	CompletionItemKind,
	InsertTextFormat
} from "vscode-languageserver-types"

import { CompletionsCollector } from "./../../jsonContributions"

export const getCustomTagValueCompletions = (
	collector: CompletionsCollector,
	referenceables: Referenceables
) => {
	CUSTOM_TAGS.forEach(customTag => {
		addCustomTagValueCompletion(collector, customTag, referenceables)
	})
}

const addReferenceablesOptions = (
	customTag: CustomTag,
	referenceables: Referenceables
): string => {
	const options = customTag.referenceEntityTypes.reduce(
		(memo, entityType) => {
			return memo.concat(referenceables.hash[entityType].keys())
		},
		[]
	)

	return "|" + options.sort().join(",") + "|"
}

export const addCustomTagValueCompletion = (
	collector: CompletionsCollector,
	customTag: CustomTag,
	referenceables: Referenceables
): void => {
	if (customTag.type) {
		switch (customTag.type) {
			case ReferenceType.FIND_IN_MAP: {
				const options = addReferenceablesOptions(
					customTag,
					referenceables
				)

				const value = `[ \${1${options}\}, $2, $3 ]`

				collector.add({
					kind: CompletionItemKind.Value,
					label: customTag.tag,
					insertText: `${customTag.tag} ${value}`,
					insertTextFormat: InsertTextFormat.Snippet
				})

				collector.add({
					kind: CompletionItemKind.Property,
					label: customTag.propertyName,
					insertText: `${customTag.propertyName}: ${value}`,
					insertTextFormat: InsertTextFormat.Snippet
				})
			}
			case ReferenceType.SUB: {
				collector.add({
					kind: CompletionItemKind.Value,
					label: customTag.tag,
					insertText: `${customTag.tag} $1`,
					insertTextFormat: InsertTextFormat.Snippet
				})

				collector.add({
					kind: CompletionItemKind.Property,
					label: customTag.propertyName,
					insertText: `${customTag.propertyName}: $1`,
					insertTextFormat: InsertTextFormat.Snippet
				})
			}
			// TODO: add support for !GetAtt attributes
			case ReferenceType.GET_ATT:
			case ReferenceType.REF:
			case ReferenceType.CONDITION:
			case ReferenceType.DEPENDS_ON: {
				const options = addReferenceablesOptions(
					customTag,
					referenceables
				)
				const value = `\${1${options}\}`

				collector.add({
					kind: CompletionItemKind.Value,
					label: customTag.tag,
					insertText: `${customTag.tag} ${value}`,
					insertTextFormat: InsertTextFormat.Snippet
				})

				collector.add({
					kind: CompletionItemKind.Property,
					label: customTag.propertyName,
					insertText: `${customTag.propertyName}: ${value}`,
					insertTextFormat: InsertTextFormat.Snippet
				})
			}
		}
	} else {
		collector.add({
			kind: CompletionItemKind.Value,
			label: customTag.tag,
			insertText: customTag.tag + " ",
			insertTextFormat: InsertTextFormat.Snippet,
			documentation: customTag.description
		})

		collector.add({
			kind: CompletionItemKind.Property,
			label: customTag.propertyName,
			insertText: "",
			insertTextFormat: InsertTextFormat.Snippet,
			documentation: customTag.description
		})
	}
}
