import { CUSTOM_TAGS_BY_TYPE } from "./../../model/custom-tags"
import {
	TextDocument,
	Diagnostic,
	DiagnosticSeverity
} from "vscode-languageserver"
import { YAMLDocument } from "./../../parser/index"

export const validateReferences = (
	document: TextDocument,
	yamlDocument: YAMLDocument
): Diagnostic[] => {
	const { referenceables, references } = yamlDocument
	const diagnostics: Diagnostic[] = []

	references.forEach(reference => {
		const customTag = CUSTOM_TAGS_BY_TYPE[reference.type]
		if (
			!customTag.referenceEntityTypes.some(entityType => {
				return Boolean(referenceables[entityType][reference.key])
			})
		) {
			diagnostics.push({
				severity: DiagnosticSeverity.Error,
				range: {
					start: document.positionAt(reference.node.start),
					end: document.positionAt(reference.node.end)
				},
				message: `[Serverless IDE]: Cannot find ${customTag.referenceEntityTypes
					.map(entityType => entityType.toLowerCase())
					.join(" or ")} with key "${reference.key}"`
			})
		}
	})

	return diagnostics
}
