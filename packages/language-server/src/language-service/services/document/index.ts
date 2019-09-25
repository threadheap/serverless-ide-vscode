import { YAMLDocument, parse, ExternalImportsCallbacks } from "../../parser"
import { TextDocument, TextDocuments, IConnection } from "vscode-languageserver"
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

export class DocumentNotFoundError extends Error {
	constructor(uri: string) {
		super(`Document with uri "${uri}" was not found`)
	}
}

export interface WorkplaceFiles {
	[uri: string]: string
}

export interface LifecycleCallbacks {
	onWorkplaceFilesInitialized: (files: WorkplaceFiles) => void
	onWorkplaceFilesChanged: (files: WorkplaceFiles) => void
	onFileCreated: (uri: string) => void
	onFileDeleted: (uri: string) => void
	onFileChanged: (uri: string) => void
	onFileOpened: (uri: string) => void
	onFileClosed: (uri: string) => void
}

/**
 * Parsed document provider service
 */
export class DocumentService {
	private cache: { [key: string]: CacheEntry } = {}
	private documents: TextDocuments | null = null
	private connection: IConnection
	private externalImportsCallbacks: ExternalImportsCallbacks
	private lifecycleCallbacks: LifecycleCallbacks
	private childrenHash: { [childUri: string]: string } = {}
	private parentHash: { [parentUri: string]: string[] } = {}
	private workspaceFiles: WorkplaceFiles = {}

	constructor(
		connection: IConnection,
		documents: TextDocuments,
		externalImportsCallbacks: ExternalImportsCallbacks,
		lifecycleCallbacks: LifecycleCallbacks
	) {
		this.connection = connection
		this.documents = documents
		this.externalImportsCallbacks = externalImportsCallbacks
		this.lifecycleCallbacks = lifecycleCallbacks

		this.requestWorkspaceFiles().then(workspaceFiles => {
			this.lifecycleCallbacks.onWorkplaceFilesInitialized(workspaceFiles)
		})

		this.connection.workspace.onDidChangeWorkspaceFolders(() => {
			this.requestWorkspaceFiles().then(workspaceFiles => {
				this.lifecycleCallbacks.onWorkplaceFilesChanged(workspaceFiles)
			})
		})

		this.connection.onNotification("workplace/oncreate", uri => {
			this.workspaceFiles[uri] = uri

			this.lifecycleCallbacks.onFileCreated(uri)
		})

		this.connection.onNotification("workplace/ondelete", uri => {
			delete this.workspaceFiles[uri]

			this.lifecycleCallbacks.onFileDeleted(uri)
		})

		this.connection.onNotification("workplace/onchanged", uri => {
			this.lifecycleCallbacks.onFileChanged(uri)
		})

		documents.onDidClose(event => {
			this.lifecycleCallbacks.onFileClosed(event.document.uri)
		})

		documents.onDidSave(async event => {
			this.lifecycleCallbacks.onFileChanged(event.document.uri)
		})

		documents.onDidOpen(async event => {
			this.lifecycleCallbacks.onFileOpened(event.document.uri)
		})
	}

	async getTextDocument(uri: string): Promise<TextDocument> {
		let document = this.documents.get(uri)

		if (!document) {
			const requestedDocument = await this.requestWorkspaceFile(uri)

			if (requestedDocument) {
				this.workspaceFiles[uri] = uri

				return requestedDocument
			}

			throw new DocumentNotFoundError(uri)
		}

		return document
	}

	async getYamlDocument(uri: string): Promise<YAMLDocument> {
		const parentUri = this.childrenHash[uri]

		const document = await this.getTextDocument(uri)

		if (document) {
			return this.getDocument(document, parentUri)
		} else {
			throw new DocumentNotFoundError(uri)
		}
	}

	registerChildParentRelation(uri: string, parentUri: string) {
		this.childrenHash[uri] = parentUri

		if (!this.parentHash[parentUri]) {
			this.parentHash[parentUri] = []
		}

		this.parentHash[parentUri].push(uri)
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
		// const cacheEntry = this.cache[textDocument.uri]

		// if (
		// 	cacheEntry &&
		// 	cacheEntry.version === textDocument.version &&
		// 	cacheEntry.isSupported
		// ) {
		// 	return this.cache[textDocument.uri].yamlDocument
		// } else {
		// 	delete this.cache[textDocument.uri]

		// 	const newEntry = {
		// 		uri: textDocument.uri,
		// 		version: textDocument.version,
		// 		yamlDocument: this.parseDocument(textDocument, parentUri),
		// 		isSupported: true
		// 	}
		// 	this.cache[textDocument.uri] = newEntry
		// 	newEntry.yamlDocument.catch(err => {
		// 		if (err instanceof DocumentNotSupportedError) {
		// 			newEntry.isSupported = false
		// 		}
		// 	})

		// 	return newEntry.yamlDocument
		// }

		return this.parseDocument(textDocument, parentUri)
	}

	private async parseDocument(
		textDocument: TextDocument,
		parentUri?: string
	): Promise<YAMLDocument> {
		const text = textDocument.getText()
		let parent: YAMLDocument | void

		if (parentUri) {
			parent = await this.getYamlDocument(parentUri)
		}

		if (parent || isSupportedDocument(text)) {
			return Promise.resolve(
				parse(
					textDocument,
					this.externalImportsCallbacks,
					parent && {
						uri: parentUri,
						documentType: parent.documentType
					}
				)
			)
		}

		return Promise.reject(new DocumentNotSupportedError())
	}

	private async requestWorkspaceFiles(): Promise<WorkplaceFiles> {
		return await this.connection
			.sendRequest("workplace/list", "**/*.{yaml,yml}")
			.then((filesList: string[]) => {
				filesList.forEach(fileUri => {
					this.workspaceFiles[fileUri] = fileUri
				})

				return this.workspaceFiles
			})
	}

	private async requestWorkspaceFile(
		uri: string
	): Promise<TextDocument | void> {
		const content: string = await this.connection.sendRequest(
			"workplace/file",
			uri
		)

		if (content) {
			return TextDocument.create(uri, "yaml", 0, content)
		}
	}
}
