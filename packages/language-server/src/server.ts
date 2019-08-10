"use strict"

import get from "ts-get"
import {
	CompletionList,
	createConnection,
	IConnection,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocument,
	TextDocumentPositionParams,
	TextDocuments
} from "vscode-languageserver"

import { configure as configureHttpRequests } from "request-light"
import * as nls from "vscode-nls"
import {
	getLanguageService as getCustomLanguageService,
	LanguageService
} from "./language-service/languageService"
import {
	ExtensionSettings,
	LanguageSettings,
	ValidationProvider
} from "./language-service/model/settings"
import { parse as parseYAML } from "./language-service/parser"
import { removeDuplicatesObj } from "./language-service/utils/arrayUtils"
import { completionHelper } from "./language-service/utils/completion-helper"
import { isSupportedDocument } from "./language-service/utils/document"
import { initializeAnalytics } from "./language-service/services/analytics"
import documentService from "./language-service/services/document"

nls.config(process.env.VSCODE_NLS_CONFIG as any)

// Create a connection for the server.
let connection: IConnection = null
if (process.argv.indexOf("--stdio") === -1) {
	connection = createConnection(ProposedFeatures.all)
} else {
	connection = createConnection()
}

// eslint-disable-next-line no-console
console.log = connection.console.log.bind(connection.console)
// eslint-disable-next-line no-console
console.error = connection.console.error.bind(connection.console)

const documents: TextDocuments = new TextDocuments()
let customLanguageService: LanguageService
let workspaceRoot: string

connection.onInitialize(
	(params: InitializeParams): InitializeResult => {
		initializeAnalytics(connection)
		workspaceRoot = params.rootPath

		return {
			capabilities: {
				textDocumentSync: documents.syncKind,
				completionProvider: { resolveProvider: true },
				signatureHelpProvider: {},
				hoverProvider: true,
				documentSymbolProvider: true,
				documentFormattingProvider: false
			}
		}
	}
)

documents.onDidClose(event => {
	cleanPendingValidation(event.document)
	documentService.clear(event.document)
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] })
})

documents.onDidSave(async event => {
	await triggerValidation(event.document)
})

documents.onDidOpen(async event => {
	await triggerValidation(event.document)
})

connection.onInitialized(() => {
	connection.onDidChangeConfiguration(change => {
		const settings = change.settings as ExtensionSettings
		configureHttpRequests(
			settings.http && settings.http.proxy,
			settings.http && settings.http.proxyStrictSSL
		)

		const languageSettings: LanguageSettings = {
			validate: get(
				settings,
				input => input.serverlessIDE.validate,
				true
			),
			hover: get(settings, input => input.serverlessIDE.hover, true),
			completion: get(
				settings,
				input => input.serverlessIDE.completion,
				true
			),
			validationProvider: get(
				settings,
				input => input.serverlessIDE.validationProvider,
				ValidationProvider["cfn-lint"]
			),
			cfnLint: {
				path: get(
					settings,
					input => input.serverlessIDE.cfnLint.path,
					"cfn-lint"
				),
				appendRules: get(
					settings,
					input => input.serverlessIDE.cfnLint.appendRules,
					[]
				),
				ignoreRules: get(
					settings,
					input => input.serverlessIDE.cfnLint.ignoreRules,
					[]
				),
				overrideSpecPath: get(
					settings,
					input => input.serverlessIDE.cfnLint.overrideSpecPath,
					undefined
				)
			},
			workspaceRoot
		}

		if (customLanguageService) {
			customLanguageService.configure(languageSettings)
		} else {
			customLanguageService = getCustomLanguageService(languageSettings)
			customLanguageService.configure(languageSettings)
		}

		documents.all().forEach(triggerValidation)
	})

	connection.onCompletion(textDocumentPosition => {
		const textDocument = documents.get(
			textDocumentPosition.textDocument.uri
		)

		const result: CompletionList = {
			items: [],
			isIncomplete: false
		}

		if (!textDocument) {
			return Promise.resolve(result)
		}

		if (!isSupportedDocument(textDocument.getText())) {
			return Promise.resolve(void 0)
		}

		const completionFix = completionHelper(
			textDocument,
			textDocumentPosition.position
		)
		const newText = completionFix.newText
		const jsonDocument = parseYAML(newText)
		return customLanguageService.doComplete(
			textDocument,
			textDocumentPosition.position,
			jsonDocument
		)
	})

	connection.onCompletionResolve(completionItem => {
		return customLanguageService.doResolve(completionItem)
	})

	connection.onHover(
		async (textDocumentPositionParams: TextDocumentPositionParams) => {
			const document = documents.get(
				textDocumentPositionParams.textDocument.uri
			)

			if (!document) {
				return Promise.resolve(void 0)
			}

			try {
				const jsonDocument = await documentService.get(document)

				return customLanguageService.doHover(
					document,
					textDocumentPositionParams.position,
					jsonDocument
				)
			} catch (err) {
				// do nothing
			}
		}
	)

	connection.onDocumentSymbol(async document => {
		const uri = documents.get(document.textDocument.uri)

		if (!uri) {
			return
		}

		try {
			const jsonDocument = await documentService.get(uri)
			return customLanguageService.findDocumentSymbols(uri, jsonDocument)
		} catch (err) {
			// do nothing
		}
	})

	documents.all().forEach(triggerValidation)
})

const pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {}
const validationDelayMs = 200

function cleanPendingValidation(textDocument: TextDocument): void {
	const request = pendingValidationRequests[textDocument.uri]
	if (request) {
		clearTimeout(request)
		delete pendingValidationRequests[textDocument.uri]
	}
}

function triggerValidation(textDocument: TextDocument) {
	cleanPendingValidation(textDocument)

	return new Promise((resolve, reject) => {
		pendingValidationRequests[textDocument.uri] = setTimeout(() => {
			delete pendingValidationRequests[textDocument.uri]
			validateTextDocument(textDocument)
				.then(resolve)
				.catch(reject)
		}, validationDelayMs)
	})
}

async function validateTextDocument(textDocument: TextDocument) {
	if (!textDocument) {
		return
	}

	const text = textDocument.getText()

	if (text.length === 0) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
		return
	}

	try {
		const yamlDocument = await documentService.get(textDocument)
		customLanguageService
			.doValidation(textDocument, yamlDocument)
			.then(diagnosticResults => {
				const diagnostics = []

				diagnosticResults.forEach(diagnosticItem => {
					diagnosticItem.severity = 1 // Convert all warnings to errors
					diagnostics.push(diagnosticItem)
				})

				connection.sendDiagnostics({
					uri: textDocument.uri,
					diagnostics: removeDuplicatesObj(diagnostics)
				})
			})
	} catch (err) {
		// do nothing
	}
}

documents.listen(connection)
connection.listen()
