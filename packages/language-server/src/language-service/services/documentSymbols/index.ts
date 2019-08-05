"use strict"

import * as Parser from "../../parser/json"
import { YAMLDocument } from "./../../parser/index"

import {
	Location,
	Range,
	SymbolInformation,
	SymbolKind,
	TextDocument
} from "vscode-languageserver-types"

export class YAMLDocumentSymbols {
	findDocumentSymbols(
		document: TextDocument,
		doc: YAMLDocument
	): SymbolInformation[] {
		if (!doc) {
			return null
		}

		const collectOutlineEntries = (
			result: SymbolInformation[],
			node: Parser.ASTNode,
			containerName: string
		): SymbolInformation[] => {
			if (node.type === "array") {
				;(node as Parser.ArrayASTNode).items.forEach(
					(itemNode: Parser.ASTNode) => {
						collectOutlineEntries(result, itemNode, containerName)
					}
				)
			} else if (node.type === "object") {
				const objectNode = node as Parser.ObjectASTNode

				objectNode.properties.forEach(
					(property: Parser.PropertyASTNode) => {
						const location = Location.create(
							document.uri,
							Range.create(
								document.positionAt(property.start),
								document.positionAt(property.end)
							)
						)
						const valueNode = property.value
						if (valueNode) {
							const childContainerName = containerName
								? containerName + "." + property.key.value
								: property.key.value
							result.push({
								name: property.key.getValue(),
								kind: this.getSymbolKind(valueNode.type),
								location,
								containerName
							})
							collectOutlineEntries(
								result,
								valueNode,
								childContainerName
							)
						}
					}
				)
			}
			return result
		}

		let results = []

		if (doc.root) {
			const result = collectOutlineEntries([], doc.root, void 0)
			results = results.concat(result)
		}

		return results
	}

	private getSymbolKind(nodeType: string): SymbolKind {
		switch (nodeType) {
			case "object":
				return SymbolKind.Module
			case "string":
				return SymbolKind.String
			case "number":
				return SymbolKind.Number
			case "array":
				return SymbolKind.Array
			case "boolean":
				return SymbolKind.Boolean
			default:
				// 'null'
				return SymbolKind.Variable
		}
	}
}
