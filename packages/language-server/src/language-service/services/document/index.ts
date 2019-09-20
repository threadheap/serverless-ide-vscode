import { YAMLDocument, parse, ExternalImportsCallbacks } from "../../parser"
import { TextDocument, TextDocuments } from "vscode-languageserver"
import { isSupportedDocument } from "../../utils/document"

interface CacheEntry {
	uri: string
	version: number
	yamlDocument: Promise<YAMLDocument>
}

/**
 * Parsed document provider service
 */
export class DocumentService {
	private cache: { [key: string]: CacheEntry } = {}
	private documents: TextDocuments | null = null
	private callbacks: ExternalImportsCallbacks

	constructor(documents: TextDocuments, callbacks: ExternalImportsCallbacks) {
		this.documents = documents
		this.callbacks = callbacks
	}

	get(textDocument: TextDocument): Promise<YAMLDocument | null> {
		return this.getDocument(textDocument)
	}

	getChildByUri(uri: string, parent: YAMLDocument) {
		const textDocument = this.documents.get(uri)

		if (textDocument) {
			return this.getDocument(textDocument, parent)
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

	clear(textDocument: TextDocument) {
		delete this.cache[textDocument.uri]
	}

	private getDocument(
		textDocument: TextDocument,
		parent?: YAMLDocument
	): Promise<YAMLDocument> {
		if (
			this.cache[textDocument.uri] &&
			this.cache[textDocument.uri].version === textDocument.version
		) {
			return this.cache[textDocument.uri].yamlDocument
		} else {
			delete this.cache[textDocument.uri]

			const newEntry = {
				uri: textDocument.uri,
				version: textDocument.version,
				yamlDocument: this.parseDocument(textDocument, parent)
			}
			this.cache[textDocument.uri] = newEntry

			return newEntry.yamlDocument
		}
	}

	private parseDocument(
		textDocument: TextDocument,
		parent?: YAMLDocument
	): Promise<YAMLDocument> {
		const text = textDocument.getText()

		if (parent || isSupportedDocument(text)) {
			return Promise.resolve(parse(textDocument, this.callbacks, parent))
		}

		return Promise.reject(new Error("Document is not supported"))
	}
}
