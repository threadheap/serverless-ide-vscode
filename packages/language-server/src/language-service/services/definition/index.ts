import { CustomTag } from "./../../model/custom-tags"
import { ASTNode } from "./../../parser/json/ast-node"
import { YAMLDocument } from "./../../parser/json/document"
import {
	TextDocument,
	Range,
	Location,
	Definition,
	TextDocumentPositionParams
} from "vscode-languageserver"
import { StringASTNode, PropertyASTNode } from "../../parser/json"
import { collectReferencesFromStringNode } from "../../parser/references"

export const getDefinition = (
	documentPosition: TextDocumentPositionParams,
	document: TextDocument,
	yamlDocument: YAMLDocument
): Definition => {
	const node = yamlDocument.getNodeFromOffset(
		document.offsetAt(documentPosition.position)
	)
	let definitionNode: ASTNode | void = undefined
	let customTag: CustomTag | void = undefined

	if (node instanceof StringASTNode) {
		if (node.customTag && node.customTag.type) {
			customTag = node.customTag
		} else if (
			node.parent instanceof PropertyASTNode &&
			node.parent.customTag
		) {
			customTag = node.parent.customTag
		}

		if (customTag) {
			const references = collectReferencesFromStringNode(node, customTag)

			for (let reference of references) {
				for (let entityType of customTag.referenceEntityTypes) {
					if (
						reference.key in
						yamlDocument.referenceables.hash[entityType]
					) {
						definitionNode =
							yamlDocument.referenceables.hash[entityType][
								reference.key
							].node
						break
					}
				}

				if (definitionNode) {
					break
				}
			}
		}
	}

	if (definitionNode) {
		return Location.create(
			documentPosition.textDocument.uri,
			Range.create(
				document.positionAt(definitionNode.start),
				document.positionAt(definitionNode.end)
			)
		)
	}

	return []
}
