import { collectReferences } from "./../../parser/references/index"
import { collectReferenceables } from "./../referenceables/index"
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
	const referenceables = collectReferenceables(
		yamlDocument.documentType,
		yamlDocument.root
	)
	const references = collectReferences(yamlDocument.root)
	const diagnostics: Diagnostic[] = []

	references.forEach(reference => {
		if (!referenceables[reference.key]) {
			diagnostics.push({
				severity: DiagnosticSeverity.Error,
				range: {
					start: document.positionAt(reference.node.start),
					end: document.positionAt(reference.node.end)
				},
				message: `[Serverless IDE]: Cannot find resource for key "${reference.key}"`
			})
		}
	})

	return diagnostics
}
