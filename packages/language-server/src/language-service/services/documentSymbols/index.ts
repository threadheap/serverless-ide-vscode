import * as Parser from "@serverless-ide/config"
import {
	DocumentSymbol,
	Range,
	SymbolKind,
	TextDocument
} from "vscode-languageserver-types"

const filterChildren = (
	children: (DocumentSymbol | void)[]
): DocumentSymbol[] => {
	return children.filter(Boolean) as DocumentSymbol[]
}

export const findDocumentSymbols = (
	document: TextDocument,
	yamlDocument: Parser.YAMLDocument
): DocumentSymbol[] => {
	const { root } = yamlDocument

	if (root instanceof Parser.ObjectASTNode) {
		return filterChildren(
			root.getChildNodes().map((childNode: Parser.PropertyASTNode) => {
				return collectOutlineEntries(document, childNode)
			})
		)
	}

	return []
}

const collectOutlineEntries = (
	document: TextDocument,
	node: Parser.ASTNode
): DocumentSymbol | void => {
	const range = Range.create(
		document.positionAt(node.start),
		document.positionAt(node.end)
	)

	if (node instanceof Parser.ArrayASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.Array,
			range,
			range,
			filterChildren(
				node.getChildNodes().map(itemNode => {
					return collectOutlineEntries(document, itemNode)
				})
			)
		)
	} else if (node instanceof Parser.ObjectASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.Module,
			range,
			range,
			filterChildren(
				node.getChildNodes().map(childNode => {
					return collectOutlineEntries(document, childNode)
				})
			)
		)
	} else if (node instanceof Parser.PropertyASTNode) {
		return collectOutlineEntries(document, node.value)
	} else if (node instanceof Parser.BooleanASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.Boolean,
			range,
			range
		)
	} else if (node instanceof Parser.NumberASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.Number,
			range,
			range
		)
	} else if (node instanceof Parser.NullASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.Null,
			range,
			range
		)
	} else if (node instanceof Parser.StringASTNode) {
		return DocumentSymbol.create(
			node.location.toString(),
			undefined,
			SymbolKind.String,
			range,
			range
		)
	}
}
