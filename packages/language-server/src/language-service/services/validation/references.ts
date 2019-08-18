import { CUSTOM_TAGS_BY_TYPE } from "./../../model/custom-tags"
import {
	TextDocument,
	Diagnostic,
	DiagnosticSeverity
} from "vscode-languageserver"
import { YAMLDocument } from "./../../parser/index"
import { ReferenceEntityType } from "../../model/references"

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
