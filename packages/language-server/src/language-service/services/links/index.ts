import * as Parser from "@serverless-ide/config"
import { DocumentLink, Range, TextDocument } from "vscode-languageserver-types"

export const findDocumentLinks = (
	document: TextDocument,
	yamlDocument: Parser.YAMLDocument
): DocumentLink[] => {
	const { root } = yamlDocument
	const links: DocumentLink[] = []

	const collectLinks = (node: Parser.ASTNode) => {
		if (node instanceof Parser.ExternalImportASTNode) {
			const uri = node.getUri()

			if (uri) {
				links.push(
					DocumentLink.create(
						Range.create(
							document.positionAt(node.start),
							document.positionAt(node.end)
						),
						uri
					)
				)
			}
		} else {
			node.getChildNodes().forEach(collectLinks)
		}
	}

	if (root) {
		collectLinks(root)
	}

	return links
}
