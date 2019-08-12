import * as url from "url"

export const isRemoteUrl = (str: string): boolean => {
	return Boolean(url.parse(str).hostname)
}
