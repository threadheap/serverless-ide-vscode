import * as vscode from "vscode"

export class Settings {
	readonly prefix: string

	constructor(prefix: string) {
		this.prefix = prefix
	}

	get<T>(key: string, defaultValue?: T): T | undefined {
		// tslint:disable-next-line:no-null-keyword
		const settings = vscode.workspace.getConfiguration(this.prefix, null)
		if (settings) {
			const val = settings.get<T>(key)
			if (val) {
				return val
			}
		}

		return defaultValue || undefined
	}

	async set<T>(
		key: string,
		value: T,
		target: vscode.ConfigurationTarget
	): Promise<void> {
		const settings = vscode.workspace.getConfiguration(this.prefix, null)

		await settings.update(key, value, target)
	}
}

export default new Settings("serverlessIDE")
