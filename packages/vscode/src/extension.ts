"use strict"

import * as path from "path"

import { ExtensionContext, languages, workspace, Uri } from "vscode"
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient"
import * as packageJSON from "../package.json"
import { createReporter, AnalyticsEvent, Exception } from "./analytics"
import createValidationErrorDialog from "./validation-error-dialog"
import registerCommands from "./commands"
import { filterGitIgnoredFiles } from "./workplace/find.js"

let client: LanguageClient

const analytics = createReporter(
	`${packageJSON.publisher}.${packageJSON.name}`,
	packageJSON.version,
	"936e3290fec1ab6c784fb2a5d06d9d47"
)

interface AnalyticsPayload {
	action: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	attributes: { [key: string]: any }
}

interface ExceptionPayload {
	message: string
	stack: string
}

class GenericLanguageServerException extends Error {
	constructor(message: string, stack: string) {
		super()
		this.name = "GenericLanguageServerException"
		this.stack = stack
		this.message = message
	}
}

export async function activate(context: ExtensionContext) {
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

	const yamlFilesWatcher = workspace.createFileSystemWatcher(
		"**/*.{yaml,yml}"
	)

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
			fileEvents: [yamlFilesWatcher]
		}
	}

	client = new LanguageClient(
		"serverless-ide-client",
		"Serverless IDE: AWS SAM and CloudFormation Support",
		serverOptions,
		clientOptions
	)
	const disposable = client.start()

	const onFileSync = async (uri: Uri) => {
		const uris = await filterGitIgnoredFiles([uri])

		if (uris.length) {
			client.sendNotification("workplace/oncreate", uris[0].toString())
		}
	}

	yamlFilesWatcher.onDidCreate(onFileSync)
	yamlFilesWatcher.onDidDelete(onFileSync)
	yamlFilesWatcher.onDidChange(onFileSync)

	client.onReady().then(() => {
		const validationErrorDialog = createValidationErrorDialog(
			context,
			analytics
		)

		client.onRequest("workplace/list", async pattern => {
			// https://github.com/Microsoft/vscode/issues/48674#issuecomment-422950502
			const exclude = [
				...Object.keys(
					(await workspace
						.getConfiguration("search", null)
						.get("exclude")) || {}
				),
				...Object.keys(
					(await workspace
						.getConfiguration("files", null)
						.get("exclude")) || {}
				)
			].join(",")

			const uris = await workspace.findFiles(pattern, `{${exclude}}`)

			return (await filterGitIgnoredFiles(uris)).map(String)
		})

		client.onRequest("workplace/file", async (uri: string) => {
			const file = await workspace.openTextDocument(Uri.parse(uri))

			return file.getText()
		})

		client.onNotification(
			"custom/analytics",
			(payload: AnalyticsPayload) => {
				// eslint-disable-next-line no-console
				analytics.sendEvent(
					new AnalyticsEvent(payload.action, payload.attributes)
				)
			}
		)

		client.onNotification("custom/cfn-lint-installation-error", () => {
			validationErrorDialog.showNotification()
		})

		client.onNotification(
			"custom/exception",
			(payload: ExceptionPayload) => {
				const error = new GenericLanguageServerException(
					payload.message,
					payload.stack
				)
				// eslint-disable-next-line no-console
				console.error(
					"[ServerlessIDE] Unhandled exception in language server: " +
						error
				)
				analytics.sendException(new Exception(error, {}))
			}
		)
	})

	context.subscriptions.push(disposable)
	context.subscriptions.push(analytics)
	registerCommands(context)

	languages.setLanguageConfiguration("yaml", {
		wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
	})

	await analytics.sendEvent(new AnalyticsEvent("activated", {}))
}

export async function deactivate(): Promise<void> {
	await analytics.sendEvent(new AnalyticsEvent("deactivated", {}))

	if (!client) {
		return undefined
	}
	analytics.dispose()
	return client.stop() as Promise<void>
}
