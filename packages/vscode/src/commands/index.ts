import * as os from "os"
import * as vscode from "vscode"

export const INSTALL_CFN_LITN = "ServerlessIDE.installCfnLint"

export default (context: vscode.ExtensionContext) => {
	context.subscriptions.push(
		vscode.commands.registerCommand(INSTALL_CFN_LITN, () => {
			switch (os.platform()) {
				case "darwin": {
					const terminal = vscode.window.createTerminal()
					terminal.show()
					terminal.sendText("brew install cfn-lint\n")
					break
				}
				case "linux":
				case "win32": {
					const terminal = vscode.window.createTerminal()
					terminal.show()
					terminal.sendText("pip install cfn-lint\n")
					break
				}
				default:
					vscode.commands.executeCommand(
						"vscode.open",
						vscode.Uri.parse(
							"https://github.com/threadheap/serverless-ide-vscode#settings"
						)
					)
					break
			}
		})
	)
}
