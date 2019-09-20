"use strict"

import get from "ts-get"
import {
	createConnection,
	IConnection,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocumentPositionParams,
	TextDocuments,
	ReferenceParams
} from "vscode-languageserver"

import { configure as configureHttpRequests } from "request-light"
import * as nls from "vscode-nls"
import {
	LanguageService,
	LanguageServiceImpl
} from "./language-service/languageService"
import {
	ExtensionSettings,
	LanguageSettings,
	ValidationProvider
} from "./language-service/model/settings"
import { initializeAnalytics } from "./language-service/services/analytics"

nls.config(process.env.VSCODE_NLS_CONFIG as nls.Options)

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
				documentFormattingProvider: false,
				// test
				definitionProvider: true,
				referencesProvider: true
			}
		}
	}
)

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
			customLanguageService = new LanguageServiceImpl(
				languageSettings,
				connection,
				documents
			)
			customLanguageService.configure(languageSettings)
		}

		documents.all().forEach(document => {
			customLanguageService.doValidation(document)
		})
	})

	connection.onCompletion(textDocumentPosition => {
		const textDocument = documents.get(
			textDocumentPosition.textDocument.uri
		)

		return customLanguageService.doComplete(
			textDocument,
			textDocumentPosition.position
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
				return
			}

			return customLanguageService.doHover(
				document,
				textDocumentPositionParams.position
			)
		}
	)

	connection.onDocumentSymbol(async documentParams => {
		const document = documents.get(documentParams.textDocument.uri)

		if (!document) {
			return
		}

		return customLanguageService.findDocumentSymbols(document)
	})

	connection.onDefinition((documentPosition: TextDocumentPositionParams) => {
		return customLanguageService.findDefinitions(documentPosition)
	})

	connection.onReferences((referenceParams: ReferenceParams) => {
		return customLanguageService.findReferences(referenceParams)
	})

	documents.all().forEach(document => {
		customLanguageService.doValidation(document)
	})
})

documents.listen(connection)
connection.listen()
