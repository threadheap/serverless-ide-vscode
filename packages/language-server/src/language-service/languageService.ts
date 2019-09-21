import { JSONSchema } from "./jsonSchema"
import { CompletionItem } from "vscode-json-languageservice"
import { CfnLintFailedToExecuteError } from "./services/validation/errors"
import {
	IConnection,
	TextDocuments,
	TextDocumentPositionParams,
	ResponseError,
	ReferenceParams,
	Location
} from "vscode-languageserver"
import {
	CompletionList,
	Position,
	TextDocument,
	DocumentSymbol,
	Hover,
	Definition
} from "vscode-languageserver-types"
import { LanguageSettings } from "./model/settings"
import { ExternalImportsCallbacks, parse } from "./parser"
import { YAMLCompletion } from "./services/completion"
import { findDocumentSymbols } from "./services/documentSymbols"
import { YAMLHover } from "./services/hover"
import { JSONSchemaService } from "./services/jsonSchema"
import { YAMLValidation } from "./services/validation"
import { DocumentService } from "./services/document"
import { sendAnalytics } from "./services/analytics"
import { completionHelper } from "./utils/completion-helper"
import { getDefinition } from "./services/definition"
import { getReferences } from "./services/reference"

export interface WorkspaceContextService {
	resolveRelativePath(relativePath: string, resource: string): string
}
/**
 * The schema request service is used to fetch schemas. The result should the schema file comment, or,
 * in case of an error, a displayable error string
 */
export type SchemaRequestService = (uri: string) => Promise<string>

export interface CustomFormatterOptions {
	singleQuote?: boolean
	bracketSpacing?: boolean
	proseWrap?: string
}

export interface LanguageService {
	configure(settings: LanguageSettings): void
	doComplete(
		document: TextDocument,
		position: Position
	): Promise<CompletionList>
	doValidation(document: TextDocument): Promise<void>
	doHover(
		document: TextDocument,
		position: Position
	): Promise<Hover | ResponseError<void>>
	findDocumentSymbols(document: TextDocument): Promise<DocumentSymbol[]>
	findDefinitions(
		documentPosition: TextDocumentPositionParams
	): Promise<Definition | ResponseError<void>>
	findReferences(
		params: ReferenceParams
	): Promise<Location[] | ResponseError<void>>
	doResolve(completionItem: CompletionItem): Promise<CompletionItem>
	clearDocument(uri: string): void
}

const VALIDATION_DELAY_MS = 200

export class LanguageServiceImpl implements LanguageService {
	private documents: TextDocuments
	private connection: IConnection
	private callbacks: ExternalImportsCallbacks
	private schemaService: JSONSchemaService
	private documentService: DocumentService
	private completer: YAMLCompletion
	private hover: YAMLHover
	private validation: YAMLValidation
	private pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {}

	constructor(
		settings: LanguageSettings,
		connection: IConnection,
		documents: TextDocuments
	) {
		this.connection = connection
		this.documents = documents

		this.callbacks = {
			onRegisterExternalImport: (uri: string, parentUri: string) => {
				this.documentService.registerChildParentRelation(uri, parentUri)
			},
			onValidateExternalImport: async (
				uri: string,
				parentUri: string,
				schema: JSONSchema,
				property?: string
			) => {
				const document = this.documents.get(uri)
				this.schemaService.registerPartialSchema(uri, schema, property)

				if (document) {
					const yamlDocument = await this.documentService.getChildByUri(
						uri,
						parentUri
					)

					this.validation.doExternalImportValidation(
						document,
						yamlDocument
					)
				}
			}
		}

		this.schemaService = new JSONSchemaService()
		this.documentService = new DocumentService(documents, this.callbacks)

		this.completer = new YAMLCompletion(this.schemaService)
		this.hover = new YAMLHover(this.schemaService)
		this.validation = new YAMLValidation(
			this.schemaService,
			settings.workspaceRoot,
			connection
		)

		documents.onDidClose(event => {
			this.cleanPendingValidation(event.document)
			this.clearDocument(event.document.uri)
			connection.sendDiagnostics({
				uri: event.document.uri,
				diagnostics: []
			})
		})

		documents.onDidSave(async event => {
			const children = this.documentService.getChildrenUris(
				event.document.uri
			)

			// if parent document is changed
			if (children && children.length) {
				this.schemaService.clearPartialSchema(event.document.uri)
				this.documentService.clearRelations(event.document.uri)
			}

			await this.doValidation(event.document)
		})

		documents.onDidOpen(async event => {
			await this.doValidation(event.document)
		})
	}

	configure(newSettings: LanguageSettings) {
		this.validation.configure(newSettings)
		this.hover.configure(newSettings)
		this.completer.configure(newSettings)
	}

	async doComplete(document: TextDocument, position: Position) {
		const result: CompletionList = {
			items: [],
			isIncomplete: false
		}

		if (!document) {
			return result
		}

		const completionFix = completionHelper(document, position)
		const yamlDocument = parse(completionFix.newDocument)
		return this.completer.doComplete(document, position, yamlDocument)
	}

	doValidation(textDocument: TextDocument): Promise<void> {
		this.cleanPendingValidation(textDocument)

		return new Promise((resolve, reject) => {
			this.pendingValidationRequests[textDocument.uri] = setTimeout(
				() => {
					delete this.pendingValidationRequests[textDocument.uri]
					this.validate(textDocument)
						.then(resolve)
						.catch(reject)
				},
				VALIDATION_DELAY_MS
			)
		})
	}

	async findDocumentSymbols(
		document: TextDocument
	): Promise<DocumentSymbol[]> {
		try {
			const yamlDocument = await this.documentService.get(document)
			return findDocumentSymbols(document, yamlDocument)
		} catch (err) {
			return []
		}
	}

	async findDefinitions(
		documentPosition: TextDocumentPositionParams
	): Promise<Definition | ResponseError<void>> {
		const document = this.documents.get(documentPosition.textDocument.uri)

		try {
			const yamlDocument = await this.documentService.get(document)

			return getDefinition(documentPosition, document, yamlDocument)
		} catch (err) {
			return new ResponseError(1, err.message)
		}
	}

	async findReferences(
		referenceParams: ReferenceParams
	): Promise<Location[] | ResponseError<void>> {
		const document = this.documents.get(referenceParams.textDocument.uri)

		try {
			const yamlDocument = await this.documentService.get(document)

			return getReferences(referenceParams, document, yamlDocument)
		} catch (err) {
			return new ResponseError(1, err.message)
		}
	}

	doResolve(completionItem: CompletionItem): Promise<CompletionItem> {
		sendAnalytics({
			action: "resolveCompletion",
			attributes: {
				label: completionItem.label
			}
		})

		return this.completer.doResolve(completionItem)
	}

	clearDocument(uri: string) {
		const children = this.documentService.getChildrenUris(uri)

		this.documentService.clear(uri)

		if (children && children.length > 0) {
			children.forEach(childUri =>
				this.schemaService.clearPartialSchema(childUri)
			)
		}
	}

	async doHover(
		document: TextDocument,
		position: Position
	): Promise<Hover | ResponseError<void>> {
		try {
			const yamlDocument = await this.documentService.get(document)

			return this.hover.doHover(document, position, yamlDocument)
		} catch (err) {
			return new ResponseError(1, err.message)
		}
	}

	private async validate(document: TextDocument) {
		if (!document) {
			return
		}

		const text = document.getText()

		if (text.length === 0) {
			this.connection.sendDiagnostics({
				uri: document.uri,
				diagnostics: []
			})
			return
		}

		try {
			const yamlDocument = await this.documentService.get(document)
			sendAnalytics({
				action: "validateDocument",
				attributes: {
					documentType: yamlDocument.documentType
				}
			})

			await this.validation.doValidation(document, yamlDocument)
		} catch (err) {
			if (err instanceof CfnLintFailedToExecuteError) {
				this.connection.sendNotification(
					"custom/cfn-lint-installation-error"
				)
			}
		}
	}

	private cleanPendingValidation = (textDocument: TextDocument): void => {
		const request = this.pendingValidationRequests[textDocument.uri]
		if (request) {
			clearTimeout(request)
			delete this.pendingValidationRequests[textDocument.uri]
		}
	}
}
