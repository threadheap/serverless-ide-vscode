import {
	CUSTOM_TAGS_BY_TYPE,
	ReferenceEntityType,
	YAMLDocument
} from "@serverless-ide/config"
import {
	Diagnostic,
	DiagnosticSeverity,
	TextDocument
} from "vscode-languageserver"

export const validateReferences = async (
	document: TextDocument,
	yamlDocument: YAMLDocument
): Promise<Diagnostic[]> => {
	const { referenceables, references } = yamlDocument
	const diagnostics: Diagnostic[] = []

	Object.keys(references.hash).forEach(referenceKey => {
		references.hash[referenceKey].forEach(reference => {
			const customTag = CUSTOM_TAGS_BY_TYPE[reference.type]

			if (
				!customTag.referenceEntityTypes.some(
					(entityType: ReferenceEntityType) => {
						return Boolean(
							referenceables.hash[entityType].contains(
								reference.key
							)
						)
					}
				)
			) {
				diagnostics.push({
					severity: DiagnosticSeverity.Error,
					range: {
						start: document.positionAt(reference.node.start),
						end: document.positionAt(reference.node.end)
					},
					message: `[Serverless IDE]: Cannot find ${customTag.referenceEntityTypes
						.map((entityType: ReferenceEntityType) =>
							entityType.toLowerCase()
						)
						.join(" or ")} with key "${reference.key}"`
				})
			}
		})
	})

	return diagnostics
}
