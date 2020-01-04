"use strict"

import { configure as configureHttpRequests } from "request-light"
import get from "ts-get"
import {
	createConnection,
	IConnection,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	ReferenceParams,
	TextDocumentPositionParams,
	TextDocuments
} from "vscode-languageserver"
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
	connection = createConnection(process.stdin, process.stdout)
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
				definitionProvider: true,
				referencesProvider: true,
				documentLinkProvider: { resolveProvider: false },
				workspace: {
					workspaceFolders: {
						supported: true,
						changeNotifications: true
					}
				}
			}
		}
	}
)

connection.onInitialized(() => {
	connection.workspace.onDidChangeWorkspaceFolders(async () => {
		const settings = await connection.workspace.getConfiguration()

		updateConfiguration(settings)
	})

	connection.onDidChangeConfiguration(change => {
		updateConfiguration(change.settings)
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
		async (
			textDocumentPositionParams: TextDocumentPositionParams
		): Promise<any> => {
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

	connection.onDefinition(
		(documentPosition: TextDocumentPositionParams): Promise<any> => {
			return customLanguageService.findDefinitions(documentPosition)
		}
	)

	connection.onReferences(
		(referenceParams: ReferenceParams): Promise<any> => {
			return customLanguageService.findReferences(referenceParams)
		}
	)

	connection.onDocumentLinks(linkParams => {
		return customLanguageService.findLinks(linkParams)
	})
})

const updateConfiguration = (settings: ExtensionSettings) => {
	configureHttpRequests(
		settings.http && settings.http.proxy,
		settings.http && settings.http.proxyStrictSSL
	)

	const languageSettings: LanguageSettings = {
		validate: get(settings, input => input.serverlessIDE.validate, true),
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
}

documents.listen(connection)
connection.listen()
