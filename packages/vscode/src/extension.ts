"use strict"

import * as path from "path"

import { ExtensionContext, extensions, languages, Uri, workspace } from "vscode"
import {
	LanguageClient,
	LanguageClientOptions,
	NotificationType,
	ServerOptions,
	TransportKind
} from "vscode-languageclient"
import {
	CUSTOM_CONTENT_REQUEST,
	CUSTOM_SCHEMA_REQUEST,
	schemaContributor
} from "./schema-contributor"

export interface ISchemaAssociations {
	[pattern: string]: string[]
}

// tslint:disable-next-line: no-namespace
namespace SchemaAssociationNotification {
	export const type: NotificationType<
		ISchemaAssociations,
		any
	> = new NotificationType("json/schemaAssociations")
}

// tslint:disable-next-line: no-namespace
namespace DynamicCustomSchemaRequestRegistration {
	export const type: NotificationType<{}, {}> = new NotificationType(
		"yaml/registerCustomSchemaRequest"
	)
}

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join(
			"node_modules",
			"@serverless-ide/language-server",
			"out",
			"server.js"
		)
	)

	// The debug options for the server
	const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] }

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	}

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [
			{ language: "yaml", scheme: "file" },
			{ language: "yaml", scheme: "untitled" }
		],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: [
				"serverlessIDE",
				"http.proxy",
				"http.proxyStrictSSL"
			],
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: [
				workspace.createFileSystemWatcher("**/*.?(e)y?(a)ml"),
				workspace.createFileSystemWatcher("**/*.json")
			]
		}
	}

	// Create the language client and start the client.
	const client = new LanguageClient(
		"serverless-ide-client",
		"Serverless IDE: AWS SAM and CloudFormation Support",
		serverOptions,
		clientOptions
	)
	const disposable = client.start()

	// Push the disposable to the context's subscriptions so that the
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable)

	client.onReady().then(() => {
		client.sendNotification(DynamicCustomSchemaRequestRegistration.type)
		client.onRequest(CUSTOM_SCHEMA_REQUEST, resource => {
			return schemaContributor.requestCustomSchema(resource)
		})
		client.onRequest(CUSTOM_CONTENT_REQUEST, uri => {
			return schemaContributor.requestCustomSchemaContent(uri)
		})
	})

	languages.setLanguageConfiguration("yaml", {
		wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
	})

	return schemaContributor
}
