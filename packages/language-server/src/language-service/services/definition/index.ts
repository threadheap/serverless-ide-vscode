import { CustomTag } from "@serverless-ide/config"
import { ASTNode } from "@serverless-ide/config"
import {
	collectReferencesFromStringNode,
	PropertyASTNode,
	StringASTNode,
	YAMLDocument
} from "@serverless-ide/config"
import {
	Definition,
	Location,
	Range,
	TextDocument,
	TextDocumentPositionParams
} from "vscode-languageserver"

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
					const referenceable = yamlDocument.referenceables.hash[
						entityType
					].get(reference.key)

					if (referenceable) {
						definitionNode = referenceable.node
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
