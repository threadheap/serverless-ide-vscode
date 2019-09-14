import { CfnLintFailedToExecuteError } from "./errors"
import { StringASTNode, ErrorCode } from "./../../parser/json"
import { CLOUD_FORMATION, SAM } from "./../../model/document"
import { spawn } from "child_process"
import {
	Diagnostic,
	DiagnosticSeverity,
	Files,
	TextDocument
} from "vscode-languageserver"
import { Problem, YAMLDocument } from "../../parser"
import { JSONSchemaService } from "../jsonSchema"
import {
	CFNLintSettings,
	LanguageSettings,
	ValidationProvider
} from "./../../model/settings"
import { sendAnalytics } from "../analytics"
import { getDocumentType } from "../../utils/document"
import { validateReferences } from "./references"

const transformCfnLintSeverity = (errorType: string): DiagnosticSeverity => {
	switch (errorType) {
		case "Warning":
			return DiagnosticSeverity.Warning
		case "Informational":
			return DiagnosticSeverity.Information
		case "Hint":
			return DiagnosticSeverity.Hint
		default:
			// always fallback to error
			return DiagnosticSeverity.Error
	}
}

export class YAMLValidation {
	private jsonSchemaService: JSONSchemaService
	private validationEnabled: boolean
	private settings: CFNLintSettings
	private provider: ValidationProvider
	private workspaceRoot: string
	private inProgressMap: { [key: string]: boolean } = {}

	constructor(jsonSchemaService: JSONSchemaService, workspaceRoot: string) {
		this.jsonSchemaService = jsonSchemaService
		this.validationEnabled = true
		this.workspaceRoot = workspaceRoot
	}

	configure(settings: LanguageSettings) {
		this.validationEnabled = settings.validate
		this.settings = settings.cfnLint
		this.provider = settings.validationProvider
	}

	async doValidation(textDocument: TextDocument, yamlDocument: YAMLDocument) {
		if (!this.validationEnabled) {
			return Promise.resolve([])
		}

		const documentType = getDocumentType(textDocument.getText())

		if (
			this.provider === ValidationProvider["cfn-lint"] &&
			(documentType === CLOUD_FORMATION || documentType === SAM)
		) {
			try {
				return await this.validateWithCfnLint(textDocument)
			} catch (err) {
				throw new CfnLintFailedToExecuteError(err.message)
			}
		}

		return await this.validateWithSchema(textDocument, yamlDocument)
	}

	private async validateWithCfnLint(
		textDocument: TextDocument
	): Promise<Diagnostic[]> {
		const args = ["--format", "json"]
		const filePath = Files.uriToFilePath(textDocument.uri)
		const fileName = textDocument.uri

		sendAnalytics({
			action: "requestCfnLintValidation",
			attributes: {
				fileName,
				...this.settings
			}
		})

		this.settings.ignoreRules.map(rule => {
			args.push("--ignore-checks", rule)
		})

		this.settings.appendRules.map(rule => {
			args.push("--append-rules", rule)
		})

		if (this.settings.overrideSpecPath) {
			args.push("--override-spec", this.settings.overrideSpecPath)
		}

		args.push("--", filePath)

		this.inProgressMap[fileName] = true

		const child = spawn(this.settings.path || "cfn-lint", args, {
			cwd: this.workspaceRoot
		})

		const diagnostics: Diagnostic[] = []

		return new Promise((resolve, reject) => {
			let output = ""
			child.stdout.on("data", (data: Buffer) => {
				output = output.concat(data.toString())
			})

			child.on("error", reject)
			child.on("close", () => {
				delete this.inProgressMap[fileName]
				resolve(diagnostics)
			})

			child.on("exit", () => {
				const tmp = output.toString()
				const errors = JSON.parse(tmp)

				if (Array.isArray(errors)) {
					errors.map(error => {
						diagnostics.push({
							range: {
								start: {
									line:
										Number(
											error.Location.Start.LineNumber
										) - 1,
									character:
										Number(
											error.Location.Start.ColumnNumber
										) - 1
								},
								end: {
									line:
										Number(error.Location.End.LineNumber) -
										1,
									character:
										Number(
											error.Location.End.ColumnNumber
										) - 1
								}
							},
							severity: transformCfnLintSeverity(error.Level),
							message: `[Serverless IDE] ${error.Rule.Id}: ${error.Message}`
						})
					})
				}

				sendAnalytics({
					action: "finishedCfnLintValidation",
					attributes: {
						fileName,
						errorsCount: diagnostics.length,
						...this.settings
					}
				})

				delete this.inProgressMap[fileName]
			})

			child.stderr.on("data", (data: Buffer) => {
				const err = data.toString()
				diagnostics.push({
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: Number.MAX_VALUE }
					},
					severity: DiagnosticSeverity.Warning,
					message: `[Serverless IDE] ${err}`
				})
			})
		})
	}

	private async validateWithSchema(
		textDocument: TextDocument,
		yamlDocument: YAMLDocument
	) {
		let diagnostics = []
		const added = {}

		sendAnalytics({
			action: "requestSchemaValidation",
			attributes: {
				fileName: textDocument.uri,
				...this.settings
			}
		})

		const schema = await this.jsonSchemaService.getSchemaForDocument(
			textDocument,
			yamlDocument
		)

		if (schema) {
			if (
				yamlDocument.documentType === CLOUD_FORMATION ||
				yamlDocument.documentType === SAM
			) {
				diagnostics = diagnostics.concat(
					await validateReferences(textDocument, yamlDocument)
				)
			}
			const currentDocProblems = yamlDocument.getValidationProblems(
				schema.schema
			)
			currentDocProblems.forEach(problem => {
				if (
					problem.message.startsWith("Incorrect type") ||
					problem.message.startsWith("Value is not accepted")
				) {
					const node = yamlDocument.getNodeFromOffset(
						problem.location.start
					)

					if (node.type === "string") {
						const stringNode = node as StringASTNode

						if (stringNode.value.startsWith("${")) {
							return
						}
					}
				}
				yamlDocument.errors.push({
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

		const addProblem = (
			{ message, location }: Problem,
			severity: number
		) => {
			const signature = `${location.start} ${location.end} ${message}`
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
					message: `[Serverless IDE] ${message}`
				})
			}
		}

		yamlDocument.errors.forEach(error => {
			addProblem(error, DiagnosticSeverity.Error)
		})

		yamlDocument.warnings.forEach(warning => {
			addProblem(warning, DiagnosticSeverity.Warning)
		})

		sendAnalytics({
			action: "finishedSchemaValidation",
			attributes: {
				fileName: textDocument.uri,
				errorsCount: diagnostics.length,
				...this.settings
			}
		})

		return diagnostics
	}
}
