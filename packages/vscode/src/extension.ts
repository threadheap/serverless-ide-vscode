"use strict"

import * as path from "path"

import { ExtensionContext, languages, workspace } from "vscode"
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient"
import * as packageJSON from "../package.json"
import { schemaContributor } from "./schema-contributor"
import { createReporter } from "./telemetry"

export interface ISchemaAssociations {
	[pattern: string]: string[]
}

let client: LanguageClient

const telemetry = createReporter(
	`${packageJSON.publisher}.${packageJSON.name}`,
	packageJSON.version,
	"e61496d8-12ad-43d9-bb32-cf41d527fdf0"
)

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
	context.subscriptions.push(telemetry.reporter)

	languages.setLanguageConfiguration("yaml", {
		wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
	})

	telemetry.sendServerEvent("activated")

	return schemaContributor
}

export function deactivate(): Promise<void> | void {
	if (!client) {
		return undefined
	}
	telemetry.sendServerEvent("deactivated")
	telemetry.reporter.dispose()
	return client.stop() as Promise<void>
}
