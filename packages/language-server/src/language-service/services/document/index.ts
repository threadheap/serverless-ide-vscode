import { YAMLDocument, parse, ExternalImportsCallbacks } from "../../parser"
import { TextDocument, TextDocuments } from "vscode-languageserver"
import { isSupportedDocument } from "../../utils/document"

interface CacheEntry {
	uri: string
	version: number
	yamlDocument: Promise<YAMLDocument>
	isSupported: boolean
}

export class DocumentNotSupportedError extends Error {
	constructor() {
		super("Document is not supported")
	}
}

/**
 * Parsed document provider service
 */
export class DocumentService {
	private cache: { [key: string]: CacheEntry } = {}
	private documents: TextDocuments | null = null
	private callbacks: ExternalImportsCallbacks
	private childrenHash: { [childUri: string]: string } = {}
	private parentHash: { [parentUri: string]: string[] } = {}

	constructor(documents: TextDocuments, callbacks: ExternalImportsCallbacks) {
		this.documents = documents
		this.callbacks = callbacks
	}

	get(textDocument: TextDocument): Promise<YAMLDocument | null> {
		const parentUri = this.childrenHash[textDocument.uri]

		return this.getDocument(textDocument, parentUri)
	}

	registerChildParentRelation(uri: string, parentUri: string) {
		this.childrenHash[uri] = parentUri

		if (!this.parentHash[parentUri]) {
			this.parentHash[parentUri] = []
		}

		this.parentHash[parentUri].push(uri)
	}

	getChildByUri(uri: string, parentUri: string) {
		const textDocument = this.documents.get(uri)

		if (textDocument) {
			return this.getDocument(textDocument, parentUri)
		}

		return null
	}

	getByUri(documentUri: string): Promise<YAMLDocument | null> {
		const textDocument = this.documents.get(documentUri)

		if (textDocument) {
			return this.get(textDocument)
		}

		return Promise.resolve(null)
	}

	getChildrenUris(parentUri: string): string[] | void {
		return this.parentHash[parentUri]
	}

	clear(uri: string) {
		delete this.cache[uri]
		this.clearRelations(uri)
	}

	clearRelations(uri: string) {
		const children = this.parentHash[uri]

		if (children && children.length) {
			children.forEach(childUri => {
				delete this.childrenHash[childUri]
				delete this.cache[childUri]
			})
		}

		if (this.childrenHash[uri]) {
			this.parentHash[this.childrenHash[uri]] = this.parentHash[
				this.childrenHash[uri]
			].filter(childUri => childUri !== uri)

			delete this.childrenHash[uri]
		}

		delete this.parentHash[uri]
	}

	private getDocument(
		textDocument: TextDocument,
		parentUri?: string
	): Promise<YAMLDocument> {
		const cacheEntry = this.cache[textDocument.uri]

		if (
			cacheEntry &&
			cacheEntry.version === textDocument.version &&
			cacheEntry.isSupported
		) {
			return this.cache[textDocument.uri].yamlDocument
		} else {
			delete this.cache[textDocument.uri]

			const newEntry = {
				uri: textDocument.uri,
				version: textDocument.version,
				yamlDocument: this.parseDocument(textDocument, parentUri),
				isSupported: true
			}
			this.cache[textDocument.uri] = newEntry
			newEntry.yamlDocument.catch(err => {
				if (err instanceof DocumentNotSupportedError) {
					newEntry.isSupported = false
				}
			})

			return newEntry.yamlDocument
		}
	}

	private async parseDocument(
		textDocument: TextDocument,
		parentUri?: string
	): Promise<YAMLDocument> {
		const text = textDocument.getText()
		let parent: YAMLDocument

		if (parentUri) {
			parent = await this.getByUri(parentUri)
		}

		if (parent || isSupportedDocument(text)) {
			return Promise.resolve(
				parse(
					textDocument,
					this.callbacks,
					parent && {
						uri: parentUri,
						documentType: parent.documentType
					}
				)
			)
		}

		return Promise.reject(new DocumentNotSupportedError())
	}
}
