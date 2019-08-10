import { YAMLDocument, parse } from "./../../parser/index"
import { TextDocument } from "vscode-languageserver"
import { isSupportedDocument } from "../../utils/document"
/**
 * Parsed document provider service
 */

interface CacheEntry {
	uri: string
	version: number
	yamlDocument: Promise<YAMLDocument>
}

class DocumentService {
	private cache: { [key: string]: CacheEntry } = {}

	get(textDocument: TextDocument): Promise<YAMLDocument> {
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
				yamlDocument: this.parseDocument(textDocument)
			}
			this.cache[textDocument.uri] = newEntry

			return newEntry.yamlDocument
		}
	}

	clear(textDocument: TextDocument) {
		delete this.cache[textDocument.uri]
	}

	parseDocument(textDocument: TextDocument): Promise<YAMLDocument> {
		const text = textDocument.getText()

		if (isSupportedDocument(text)) {
			return Promise.resolve(parse(text))
		}

		return Promise.reject(new Error("Document is not supported"))
	}
}

export default new DocumentService()
