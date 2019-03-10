"use strict"

import { DiagnosticSeverity, TextDocument } from "vscode-languageserver-types"
import { LanguageSettings } from "../../languageService"
import { Problem, YAMLDocument } from "../../parser"
import { ErrorCode } from "../../parser/jsonParser"
import { JSONSchemaService } from "../jsonSchema/lagacy_index"

export class YAMLValidation {
	private jsonSchemaService: JSONSchemaService
	private validationEnabled: boolean

	public constructor(jsonSchemaService: JSONSchemaService) {
		this.jsonSchemaService = jsonSchemaService
		this.validationEnabled = true
	}

	public configure(shouldValidate: LanguageSettings) {
		if (shouldValidate) {
			this.validationEnabled = shouldValidate.validate
		}
	}

	public async doValidation(
		textDocument: TextDocument,
		yamlDocument: YAMLDocument
	) {
		if (!this.validationEnabled) {
			return Promise.resolve([])
		}

		const diagnostics = []
		const added = {}

		await Promise.all(
			yamlDocument.documents.map(async (currentDoc, documentIndex) => {
				const schema = await this.jsonSchemaService.getSchemaForDocument(
					textDocument.uri,
					currentDoc,
					documentIndex
				)

				if (schema) {
					const currentDocProblems = currentDoc.getValidationProblems(
						schema.schema
					)
					currentDocProblems.forEach(problem => {
						currentDoc.errors.push({
							location: {
								start: problem.location.start,
								end: problem.location.end
							},
							message: problem.message,
							code: ErrorCode.Undefined
						})
					})

					if (schema && schema.errors.length > 0) {
						schema.errors.forEach(error => {
							diagnostics.push({
								severity: DiagnosticSeverity.Error,
								range: {
									start: {
										line: 0,
										character: 0
									},
									end: {
										line: 0,
										character: 1
									}
								},
								message: error
							})
						})
					}
				}
			})
		)

		const addProblem = (
			{ message, location }: Problem,
			severity: number
		) => {
			const signature =
				location.start + " " + location.end + " " + message
			// remove duplicated messages
			if (!added[signature]) {
				added[signature] = true
				const range = {
					start: textDocument.positionAt(location.start),
					end: textDocument.positionAt(location.end)
				}
				diagnostics.push({
					severity,
					range,
					message
				})
			}
		}

		yamlDocument.documents.forEach(doc => {
			doc.errors.forEach(error => {
				addProblem(error, DiagnosticSeverity.Error)
			})

			doc.warnings.forEach(warning => {
				addProblem(warning, DiagnosticSeverity.Warning)
			})
		})

		return diagnostics
	}
}
