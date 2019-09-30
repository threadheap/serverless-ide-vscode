import * as url from "url"
import * as Path from "path"

const FILE_URI_PREFIX = "file://"

export const isRemoteUrl = (str: string): boolean => {
	return Boolean(url.parse(str).hostname)
}

export const resolveRelativePath = (
	path: string,
	parentUri: string
): string | void => {
	if (Path.isAbsolute(path)) {
		return this.resolveOpts(path)
	} else {
		if (parentUri.startsWith(FILE_URI_PREFIX)) {
			return (
				FILE_URI_PREFIX +
				Path.join(
					Path.dirname(parentUri.replace(FILE_URI_PREFIX, "")),
					path
				)
			)
		}
	}
}
