"use strict"

import { PromiseConstructor } from "vscode-json-languageservice"
import {
	CompletionsCollector,
	JSONWorkerContribution
} from "../../jsonContributions"
import * as Parser from "../../parser/jsonParser"
import * as SchemaService from "../jsonSchema"

import {
	CompletionItem,
	CompletionList,
	Position,
	Range,
	TextDocument,
	TextEdit
} from "vscode-languageserver-types"

import { LanguageSettings } from "../../model/settings"
import { YAMLDocument } from "../../parser"
import { matchOffsetToDocument } from "../../utils/arrayUtils"
import * as completions from "./completions"
import * as helpers from "./helpers"

export class YAMLCompletion {
	private schemaService: SchemaService.JSONSchemaService
	private contributions: JSONWorkerContribution[]
	private promise: PromiseConstructor
	private customTags: string[]
	private completion: boolean

	constructor(
		schemaService: SchemaService.JSONSchemaService,
		contributions: JSONWorkerContribution[] = [],
		promiseConstructor?: PromiseConstructor
	) {
		this.schemaService = schemaService
		this.contributions = contributions
		this.promise = promiseConstructor || Promise
		this.customTags = []
		this.completion = true
	}

	configure(languageSettings: LanguageSettings, customTags: string[]) {
		if (languageSettings) {
			this.completion = languageSettings.completion
		}
		this.customTags = customTags
	}

	doResolve(item: CompletionItem): Promise<CompletionItem> {
		for (let i = this.contributions.length - 1; i >= 0; i--) {
			if (this.contributions[i].resolveCompletion) {
				const resolver = this.contributions[i].resolveCompletion(item)
				if (resolver) {
					return resolver
				}
			}
		}
		return Promise.resolve(item)
	}

	async doComplete(
		document: TextDocument,
		position: Position,
		doc: YAMLDocument
	): Promise<CompletionList> {
		const result: CompletionList = {
			items: [],
			isIncomplete: false
		}

		if (!this.completion) {
			return Promise.resolve(result)
		}

		const offset = document.offsetAt(position)
		if (document.getText()[offset] === ":") {
			return Promise.resolve(result)
		}

		const currentDoc = matchOffsetToDocument(offset, doc)
		if (!currentDoc) {
			return Promise.resolve(result)
		}
		let node = currentDoc.getNodeFromOffsetEndInclusive(offset)
		if (helpers.isInComment(document, node ? node.start : 0, offset)) {
			return Promise.resolve(result)
		}

		const currentWord = helpers.getCurrentWord(document, offset)

		let overwriteRange = null
		if (node && node.type === "null") {
			const nodeStartPos = document.positionAt(node.start)
			nodeStartPos.character += 1
			const nodeEndPos = document.positionAt(node.end)
			nodeEndPos.character += 1
			overwriteRange = Range.create(nodeStartPos, nodeEndPos)
		} else if (
			node &&
			(node.type === "string" ||
				node.type === "number" ||
				node.type === "boolean")
		) {
			overwriteRange = Range.create(
				document.positionAt(node.start),
				document.positionAt(node.end)
			)
		} else {
			let overwriteStart = offset - currentWord.length
			if (
				overwriteStart > 0 &&
				document.getText()[overwriteStart - 1] === '"'
			) {
				overwriteStart--
			}
			overwriteRange = Range.create(
				document.positionAt(overwriteStart),
				position
			)
		}

		const proposed: { [key: string]: CompletionItem } = {}
		const collector: CompletionsCollector = {
			add: (suggestion: CompletionItem) => {
				const existing = proposed[suggestion.label]
				if (!existing) {
					proposed[suggestion.label] = suggestion
					if (overwriteRange) {
						suggestion.textEdit = TextEdit.replace(
							overwriteRange,
							suggestion.insertText
						)
					}
					result.items.push(suggestion)
				} else if (!existing.documentation) {
					existing.documentation = suggestion.documentation
				}
			},
			setAsIncomplete: () => {
				result.isIncomplete = true
			},
			error: (message: string) => {
				// eslint-disable-next-line no-console
				console.error(message)
			},
			log: (message: string) => {
				// eslint-disable-next-line no-console
				console.log(message)
			},
			getNumberOfProposals: () => {
				return result.items.length
			}
		}

		const schema = await this.schemaService.getSchemaForDocument(
			document,
			currentDoc
		)

		if (!schema) {
			return Promise.resolve(result)
		}

		const collectionPromises: Promise<any>[] = []

		let addValue = true

		let currentProperty: Parser.PropertyASTNode = null
		if (node) {
			if (node.type === "string") {
				const stringNode = node as Parser.StringASTNode
				if (stringNode.isKey) {
					addValue = !(
						node.parent &&
						(node.parent as Parser.PropertyASTNode).value
					)
					currentProperty = node.parent
						? (node.parent as Parser.PropertyASTNode)
						: null
					if (node.parent) {
						node = node.parent.parent
					}
				}
			}
		}

		// proposals for properties
		if (node && node.type === "object") {
			// don't suggest properties that are already present
			const properties = (node as Parser.ObjectASTNode).properties
			properties.forEach(p => {
				if (!currentProperty || currentProperty !== p) {
					proposed[p.key.value] = CompletionItem.create("__")
				}
			})

			let separatorAfter = ""
			if (addValue) {
				separatorAfter = helpers.evaluateSeparatorAfter(
					document,
					document.offsetAt(overwriteRange.end)
				)
			}

			// property proposals with schema
			completions.getPropertyCompletions(
				schema,
				currentDoc,
				node,
				addValue,
				collector,
				separatorAfter
			)

			const location = node.getPath()
			this.contributions.forEach(contribution => {
				const collectPromise = contribution.collectPropertyCompletions(
					document.uri,
					location,
					currentWord,
					addValue,
					false,
					collector
				)
				if (collectPromise) {
					collectionPromises.push(collectPromise)
				}
			})
		}

		// property proposal for values
		await completions.getValueCompletions(
			schema,
			currentDoc,
			node,
			offset,
			document,
			collector
		)
		if (this.contributions.length > 0) {
			completions.getContributedValueCompletions(
				this.contributions,
				node,
				offset,
				document,
				collector,
				collectionPromises
			)
		}
		if (this.customTags.length > 0) {
			completions.getCustomTagValueCompletions(collector, this.customTags)
		}

		return this.promise.all(collectionPromises).then(() => {
			return result
		})
	}
}
