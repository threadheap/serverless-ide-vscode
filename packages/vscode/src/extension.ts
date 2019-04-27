"use strict"

import * as path from "path"

import { ExtensionContext, languages, workspace } from "vscode"
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient"
import { schemaContributor } from "./schema-contributor"

export interface ISchemaAssociations {
	[pattern: string]: string[]
}

let client: LanguageClient

export function activate(context: ExtensionContext) {
	const serverModule = context.asAbsolutePath(
		path.join(
			"node_modules",
			"@serverless-ide/language-server",
			"out",
			"server.js"
		)
	)

	const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] }

	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ language: "yaml", scheme: "file" },
			{ language: "yaml", scheme: "untitled" }
		],
		synchronize: {
			configurationSection: [
				"serverlessIDE",
				"http.proxy",
				"http.proxyStrictSSL"
			],
			fileEvents: [
				workspace.createFileSystemWatcher("**/*.?(e)y?(a)ml"),
				workspace.createFileSystemWatcher("**/.clientrc")
			]
		}
	}

	client = new LanguageClient(
		"serverless-ide-client",
		"Serverless IDE: AWS SAM and CloudFormation Support",
		serverOptions,
		clientOptions
	)
	const disposable = client.start()

	context.subscriptions.push(disposable)

	languages.setLanguageConfiguration("yaml", {
		wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
	})

	return schemaContributor
}

export function deactivate(): Promise<void> | void {
	if (!client) {
		return undefined
	}
	return client.stop() as Promise<void>
}
