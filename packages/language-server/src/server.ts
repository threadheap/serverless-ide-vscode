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
const customTags = [
	"!And",
	"!If",
	"!Not",
	"!Equals",
	"!Or",
	"!FindInMap",
	"!Base64",
	"!Cidr",
	"!Ref",
	"!Sub",
	"!GetAtt",
	"!GetAZs",
	"!ImportValue",
	"!Select",
	"!Split",
	"!Join"
]

connection.onInitialize(
	(params: InitializeParams): InitializeResult => {
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

documents.onDidChangeContent(change => {
	triggerValidation(change.document)
})

documents.onDidClose(event => {
	cleanPendingValidation(event.document)
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] })
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
			customTags,
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

	connection.onDidChangeWatchedFiles(() => {
		documents.all().forEach(validateTextDocument)
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

		if (!isSupportedDocument(textDocument)) {
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
		(textDocumentPositionParams: TextDocumentPositionParams) => {
			const document = documents.get(
				textDocumentPositionParams.textDocument.uri
			)

			if (!document) {
				return Promise.resolve(void 0)
			}

			const text = document.getText()

			if (!isSupportedDocument(document)) {
				return Promise.resolve(void 0)
			}

			const jsonDocument = parseYAML(text)
			return customLanguageService.doHover(
				document,
				textDocumentPositionParams.position,
				jsonDocument
			)
		}
	)

	connection.onDocumentSymbol(document => {
		const uri = documents.get(document.textDocument.uri)

		if (!uri) {
			return
		}

		const text = uri.getText()

		if (!isSupportedDocument(uri)) {
			return
		}

		const jsonDocument = parseYAML(text)
		return customLanguageService.findDocumentSymbols(uri, jsonDocument)
	})
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

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument)
	pendingValidationRequests[textDocument.uri] = setTimeout(() => {
		delete pendingValidationRequests[textDocument.uri]
		validateTextDocument(textDocument)
	}, validationDelayMs)
}

function validateTextDocument(textDocument: TextDocument): void {
	if (!textDocument) {
		return
	}

	const text = textDocument.getText()

	if (text.length === 0) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
		return
	}

	if (!isSupportedDocument(textDocument)) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] })
		return
	}

	const yamlDocument = parseYAML(text, customTags)
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
}

documents.listen(connection)
connection.listen()
