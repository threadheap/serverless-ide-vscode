import { ASTNode } from "@serverless-ide/config"
import * as JSONParser from "jsonc-parser"
import { CompletionItemKind, TextDocument } from "vscode-languageserver-types"

export const getLabelForValue = (value: any): string => {
	const label = typeof value === "string" ? value : JSON.stringify(value)
	if (label.length > 57) {
		return label.substr(0, 57).trim() + "..."
	}
	return label
}

export const getSuggestionKind = (type: any): CompletionItemKind => {
	if (Array.isArray(type)) {
		const array = type as any[]
		type = array.length > 0 ? array[0] : null
	}
	if (!type) {
		return CompletionItemKind.Value
	}
	switch (type) {
		case "string":
			return CompletionItemKind.Value
		case "object":
			return CompletionItemKind.Module
		case "property":
			return CompletionItemKind.Property
		default:
			return CompletionItemKind.Value
	}
}

export const getCurrentWord = (document: TextDocument, offset: number) => {
	let i = offset - 1
	const text = document.getText()
	while (i >= 0 && ' \t\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
		i--
	}
	return text.substring(i + 1, offset)
}

export const findItemAtOffset = (
	node: ASTNode,
	document: TextDocument,
	offset: number
) => {
	const scanner = JSONParser.createScanner(document.getText(), true)
	const children = node.getChildNodes()
	for (let i = children.length - 1; i >= 0; i--) {
		const child = children[i]
		if (offset > child.end) {
			scanner.setPosition(child.end)
			const token = scanner.scan()
			if (
				token === JSONParser.SyntaxKind.CommaToken &&
				offset >= scanner.getTokenOffset() + scanner.getTokenLength()
			) {
				return i + 1
			}
			return i
		} else if (offset >= child.start) {
			return i
		}
	}
	return 0
}

export const isInComment = (
	document: TextDocument,
	start: number,
	offset: number
) => {
	const scanner = JSONParser.createScanner(document.getText(), false)
	scanner.setPosition(start)
	let token = scanner.scan()
	while (
		token !== JSONParser.SyntaxKind.EOF &&
		scanner.getTokenOffset() + scanner.getTokenLength() < offset
	) {
		token = scanner.scan()
	}
	return (
		(token === JSONParser.SyntaxKind.LineCommentTrivia ||
			token === JSONParser.SyntaxKind.BlockCommentTrivia) &&
		scanner.getTokenOffset() <= offset
	)
}

export const evaluateSeparatorAfter = (
	document: TextDocument,
	offset: number
) => {
	const scanner = JSONParser.createScanner(document.getText(), true)
	scanner.setPosition(offset)
	const token = scanner.scan()
	switch (token) {
		case JSONParser.SyntaxKind.CommaToken:
		case JSONParser.SyntaxKind.CloseBraceToken:
		case JSONParser.SyntaxKind.CloseBracketToken:
		case JSONParser.SyntaxKind.EOF:
			return ""
		default:
			return ""
	}
}

export const isInArray = (document: TextDocument, node: ASTNode): boolean => {
	if (node.parent && node.parent.type === "array") {
		const nodePosition = document.positionAt(node.start)
		const arrayPosition = document.positionAt(node.start)

		return nodePosition.line === arrayPosition.line
	}

	return false
}
