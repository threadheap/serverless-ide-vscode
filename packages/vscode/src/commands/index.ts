import * as vscode from "vscode"

export const INSTALL_CFN_LITN = "ServerlessIDE.installCfnLint"

export default (context: vscode.ExtensionContext) => {
	context.subscriptions.push(
		vscode.commands.registerCommand(INSTALL_CFN_LITN, () => {
			const terminal = vscode.window.createTerminal()
			terminal.show()

			terminal.sendText("brew install cfn-lint\n")
		})
	)
}
