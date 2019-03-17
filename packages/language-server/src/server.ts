"use strict"

import {
	CompletionList,
	createConnection,
	IConnection,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocument,
	TextDocuments
} from "vscode-languageserver"

import { configure as configureHttpRequests } from "request-light"
import * as nls from "vscode-nls"
import {
	getLanguageService as getCustomLanguageService,
	LanguageSettings
} from "./language-service/languageService"
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

// tslint:disable-next-line: no-console
console.log = connection.console.log.bind(connection.console)
// tslint:disable-next-line: no-console
console.error = connection.console.error.bind(connection.console)

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments()
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

connection.onInitialize(
	(params: InitializeParams): InitializeResult => {
		return {
			capabilities: {
				textDocumentSync: documents.syncKind,
				completionProvider: { resolveProvider: true },
				hoverProvider: true,
				documentSymbolProvider: true,
				documentFormattingProvider: false
			}
		}
	}
)

export const customLanguageService = getCustomLanguageService([])

// The settings interface describes the server relevant settings part
interface Settings {
	serverlessIDE: {
		validationProvider: "default" | "cfn-lint"
		cfnLint: {
			path: string
			appendRules: string[]
			ignoreRules: string[]
			overrideSpecPath: string
		}
		validate: boolean
		hover: boolean
		completion: boolean
	}
	http: {
		proxy: string
		proxyStrictSSL: boolean
	}
}
let yamlShouldValidate = true
let yamlShouldHover = true
let yamlShouldCompletion = true
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

connection.onDidChangeConfiguration(change => {
	const settings = change.settings as Settings
	configureHttpRequests(
		settings.http && settings.http.proxy,
		settings.http && settings.http.proxyStrictSSL
	)

	if (settings.serverlessIDE) {
		yamlShouldValidate = settings.serverlessIDE.validate
		yamlShouldHover = settings.serverlessIDE.hover
		yamlShouldCompletion = settings.serverlessIDE.completion
	}

	updateConfiguration()
})

function updateConfiguration() {
	const languageSettings: LanguageSettings = {
		validate: yamlShouldValidate,
		hover: yamlShouldHover,
		completion: yamlShouldCompletion,
		customTags
	}
	customLanguageService.configure(languageSettings)

	// Revalidate any open text documents
	documents.all().forEach(triggerValidation)
}

documents.onDidChangeContent(change => {
	triggerValidation(change.document)
})

documents.onDidClose(event => {
	cleanPendingValidation(event.document)
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] })
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

connection.onDidChangeWatchedFiles(change => {
	// Monitored files have changed in VSCode
	const hasChanges = false
	if (hasChanges) {
		documents.all().forEach(validateTextDocument)
	}
})

connection.onCompletion(textDocumentPosition => {
	const textDocument = documents.get(textDocumentPosition.textDocument.uri)

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

connection.onHover(textDocumentPositionParams => {
	const document = documents.get(textDocumentPositionParams.textDocument.uri)

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
})

connection.onDocumentSymbol(documentSymbolParams => {
	const document = documents.get(documentSymbolParams.textDocument.uri)

	if (!document) {
		return
	}

	const text = document.getText()

	if (!isSupportedDocument(document)) {
		return
	}

	const jsonDocument = parseYAML(text)
	return customLanguageService.findDocumentSymbols(document, jsonDocument)
})

connection.listen()
