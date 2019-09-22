import { exec } from "child_process"
import join = require("lodash/join")
import { workspace, Uri } from "vscode"

export const filterGitIgnoredFiles = async (uris: Uri[]): Promise<Uri[]> => {
	const workspaceRelativePaths = uris.map(uri =>
		workspace.asRelativePath(uri, false)
	)
	for (const workspaceDirectory of workspace.workspaceFolders) {
		const workspaceDirectoryPath = workspaceDirectory.uri.fsPath
		try {
			const { stdout, stderr } = await new Promise<{
				stdout: string
				stderr: string
			}>((resolve, reject) => {
				exec(
					`git check-ignore ${workspaceRelativePaths.join(" ")}`,
					{ cwd: workspaceDirectoryPath },
					(error: Error & { code?: 0 | 1 | 128 }, stdout, stderr) => {
						if (error && (error.code !== 0 && error.code !== 1)) {
							reject(error)
							return
						}

						resolve({ stdout, stderr })
					}
				)
			})

			if (stderr) {
				throw new Error(stderr)
			}

			for (const relativePath of stdout.split("\n")) {
				const uri = Uri.file(
					join(workspaceDirectoryPath, relativePath.slice(1, -1))
				)
				const index = uris.findIndex(u => u.fsPath === uri.fsPath)
				if (index > -1) {
					uris.splice(index, 1)
				}
			}
		} catch (error) {}
	}

	return uris
}
