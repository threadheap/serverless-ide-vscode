"use strict"

import * as Parser from "@serverless-ide/config"
import { PromiseConstructor } from "vscode-json-languageservice"
import {
	CompletionItem,
	CompletionList,
	Position,
	Range,
	TextDocument,
	TextEdit
} from "vscode-languageserver-types"

import {
	CompletionsCollector,
	JSONWorkerContribution
} from "../../jsonContributions"
import { LanguageSettings } from "../../model/settings"
import { sendException } from "../analytics"
import * as SchemaService from "../jsonSchema"
import * as completions from "./completions"
import { getCustomTagValueCompletions } from "./custom-tags"
import * as helpers from "./helpers"

export class YAMLCompletion {
	private schemaService: SchemaService.JSONSchemaService
	private contributions: JSONWorkerContribution[]
	private promise: PromiseConstructor
	private completion: boolean

	constructor(
		schemaService: SchemaService.JSONSchemaService,
		contributions: JSONWorkerContribution[] = [],
		promiseConstructor?: PromiseConstructor
	) {
		this.schemaService = schemaService
		this.contributions = contributions
		this.promise = promiseConstructor || Promise
		this.completion = true
	}

	configure(languageSettings: LanguageSettings) {
		if (languageSettings) {
			this.completion = languageSettings.completion
		}
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
		doc: Parser.YAMLDocument
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

		let node = doc.getNodeFromOffsetEndInclusive(offset)
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
				if (!suggestion.data) {
					suggestion.data = {}
				}
				suggestion.data.documentType = doc.documentType
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
				sendException(new Error(message))
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
			doc
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

		getCustomTagValueCompletions(collector, doc.referenceables)

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
				document,
				schema,
				doc,
				node,
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
			doc,
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

		return this.promise.all(collectionPromises).then(() => {
			return result
		})
	}
}
