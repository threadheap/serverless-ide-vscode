import { ASTNode } from "@serverless-ide/config"
import {
	CompletionItemKind,
	InsertTextFormat
} from "vscode-languageserver-types"

import { CompletionsCollector } from "./../../jsonContributions"
import { RUNTIMES } from "./constants"

export const getDefaultPropertyCompletions = (
	node: ASTNode,
	collector: CompletionsCollector
) => {
	if (node) {
		switch (node.location) {
			case "Runtime": {
				RUNTIMES.forEach(runtime => {
					collector.add({
						kind: CompletionItemKind.EnumMember,
						label: runtime,
						insertText: runtime,
						insertTextFormat: InsertTextFormat.PlainText,
						documentation: ""
					})
				})
			}
			default:
				return
		}
	}
}
