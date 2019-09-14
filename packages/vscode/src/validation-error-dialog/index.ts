import { AnalyticsReporter } from "vscode-extension-analytics"
import * as vscode from "vscode"
import * as nls from "vscode-nls"
import * as os from "os"
import { INSTALL_CFN_LITN } from "../commands"
import { AnalyticsEvent } from "../analytics"
const localize = nls.loadMessageBundle()

const MISSING_CFN_LINT_MESSAGE = `
cfn-lint is not installed or could not be find in $PATH
`

const RESPONSE_YES = "Install now"

const RESPONSE_LEARN_MORE = "Learn more"

export class CfnValidationMessage {
	private context: vscode.ExtensionContext
	private analytics: AnalyticsReporter
	private isVisible: boolean = false

	constructor(
		context: vscode.ExtensionContext,
		analytics: AnalyticsReporter
	) {
		this.context = context
		this.analytics = analytics
	}

	async showNotification(): Promise<void> {
		this.analytics.sendEvent(
			new AnalyticsEvent("cfnLintErrorDialogShown", {
				isVisible: this.isVisible.toString()
			})
		)

		if (this.isVisible) {
			return
		}

		this.isVisible = true

		const notificationMessage: string = localize(
			"ServerlessIDE.validation.missingCfnLintMessage",
			MISSING_CFN_LINT_MESSAGE
		)

		return vscode.window
			.showWarningMessage(
				notificationMessage,
				RESPONSE_YES,
				RESPONSE_LEARN_MORE
			)
			.then((response: string | void) => {
				switch (response) {
					case RESPONSE_YES: {
						this.onYesAnswer()
						break
					}
					case RESPONSE_LEARN_MORE:
						this.onLearnMore()
						break
					default: {
						this.analytics.sendEvent(
							new AnalyticsEvent(
								"cfnLintErrorDialogDismissed",
								{}
							)
						)
					}
				}

				this.isVisible = false
			})
	}

	private onYesAnswer() {
		this.analytics.sendEvent(
			new AnalyticsEvent("cfnLintErrorDialogYesAnswered", {})
		)

		if (os.platform() === "darwin") {
			vscode.commands.executeCommand(INSTALL_CFN_LITN)
		} else {
			vscode.commands.executeCommand(
				"vscode.open",
				vscode.Uri.parse(
					"https://github.com/aws-cloudformation/cfn-python-lint#install"
				)
			)
		}
	}

	private onLearnMore() {
		this.analytics.sendEvent(
			new AnalyticsEvent("cfnLintErrorDialogLearnMoreAnswered", {})
		)

		vscode.commands.executeCommand(
			"vscode.open",
			vscode.Uri.parse(
				"https://github.com/threadheap/serverless-ide-vscode#settings"
			)
		)
	}
}

export default (
	context: vscode.ExtensionContext,
	analytics: AnalyticsReporter
) => {
	return new CfnValidationMessage(context, analytics)
}
