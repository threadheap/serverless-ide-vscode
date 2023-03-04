import {
	DocumentType,
	ErrorCode,
	Problem,
	StringASTNode,
	YAMLDocument
} from "@serverless-ide/config"
import { spawn } from "child_process"
import {
	Diagnostic,
	DiagnosticSeverity,
	Files,
	IConnection,
	TextDocument
} from "vscode-languageserver"

import { removeDuplicatesObj } from "../../utils/arrayUtils"
import { JSONSchemaService, ResolvedSchema } from "../jsonSchema"
import {
	CFNLintSettings,
	LanguageSettings,
	ValidationProvider
} from "./../../model/settings"
import { CfnLintFailedToExecuteError } from "./errors"
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
	private connection: IConnection

	constructor(
		jsonSchemaService: JSONSchemaService,
		workspaceRoot: string,
		connection: IConnection
	) {
		this.jsonSchemaService = jsonSchemaService
		this.validationEnabled = true
		this.connection = connection
		this.workspaceRoot = workspaceRoot
	}

	configure(settings: LanguageSettings) {
		this.validationEnabled = settings.validate
		this.settings = settings.cfnLint
		this.provider = settings.validationProvider
	}

	async doExternalImportValidation(
		textDocument: TextDocument,
		yamlDocument: YAMLDocument
	) {
		const schema = await this.jsonSchemaService.getPartialSchemaForDocumentUri(
			textDocument.uri
		)

		if (schema) {
			await this.validateWithSchema(textDocument, yamlDocument, schema)
		}
	}

	async doValidation(textDocument: TextDocument, yamlDocument: YAMLDocument) {
		if (!this.validationEnabled) {
			return Promise.resolve([])
		}

		const documentType = yamlDocument.documentType

		if (
			this.provider === ValidationProvider["cfn-lint"] &&
			(documentType === DocumentType.CLOUD_FORMATION ||
				documentType === DocumentType.SAM)
		) {
			try {
				return await this.validateWithCfnLint(textDocument)
			} catch (err) {
				throw new CfnLintFailedToExecuteError(err.message)
			}
		}

		await this.validateWithSchema(textDocument, yamlDocument)
	}

	private async validateWithCfnLint(
		textDocument: TextDocument
	): Promise<void> {
		const args = ["--format", "json"]
		const filePath = Files.uriToFilePath(textDocument.uri)
		const fileName = textDocument.uri
		const cfnLintPath = this.settings.path || "cfn-lint"

		this.settings.ignoreRules.map(rule => {
			args.push("--ignore-checks", rule)
		})

		this.settings.appendRules.map(rule => {
			args.push("--append-rules", rule)
		})

		if (this.settings.overrideSpecPath) {
			args.push("--override-spec", this.settings.overrideSpecPath)
		}

		if (!(cfnLintPath.includes(' --include-checks ') || cfnLintPath.includes(' -c '))) {
			args.push("--include-checks", "I")
		}

		args.push("--", filePath)

		this.inProgressMap[fileName] = true

		const child = spawn(cfnLintPath, args, {
			cwd: this.workspaceRoot
		})

		const diagnostics: Diagnostic[] = []

		return new Promise((resolve, reject) => {
			let output = ""
			let errorOutput = ""
			child.stdout.on("data", (data: Buffer) => {
				output = output.concat(data.toString())
			})
			child.stderr.on("data", (data: Buffer) => {
				errorOutput = errorOutput.concat(data.toString())
			})

			child.on("error", reject)
			child.on("close", () => {
				delete this.inProgressMap[fileName]

				this.sendDiagnostics(textDocument.uri, diagnostics)
				resolve()
			})

			child.on("exit", () => {
				const tmp = output.toString()
				let errors = tmp

				try {
					errors = JSON.parse(tmp)
				} catch (err) {
					diagnostics.push({
						range: {
							start: {
								line: 0,
								character: 1
							},
							end: {
								line: 0,
								character: 1
							}
						},
						severity: DiagnosticSeverity.Error,
						message: `[Serverless IDE]: cfn-lint error: ${errorOutput}`
					})
				}

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
		yamlDocument: YAMLDocument,
		documentSchema?: ResolvedSchema
	) {
		let diagnostics = []
		const added = {}

		const schema =
			documentSchema ||
			(await this.jsonSchemaService.getSchemaForDocument(
				textDocument,
				yamlDocument
			))

		if (schema) {
			if (
				yamlDocument.documentType === DocumentType.CLOUD_FORMATION ||
				yamlDocument.documentType === DocumentType.SAM
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

		this.sendDiagnostics(textDocument.uri, diagnostics)
	}

	private sendDiagnostics(uri: string, diagnostics: Diagnostic[]) {
		diagnostics.forEach(diagnosticItem => {
			diagnosticItem.severity = 1
		})

		this.connection.sendDiagnostics({
			uri,
			diagnostics: removeDuplicatesObj(diagnostics)
		})
	}
}
