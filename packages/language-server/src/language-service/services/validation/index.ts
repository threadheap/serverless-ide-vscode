import { CfnLintFailedToExecuteError } from "./errors"
import { StringASTNode, ErrorCode } from "./../../parser/json"
import { DocumentType } from "./../../model/document"
import { spawn } from "child_process"
import {
	Diagnostic,
	DiagnosticSeverity,
	Files,
	TextDocument,
	IConnection
} from "vscode-languageserver"
import { Problem, YAMLDocument } from "../../parser"
import { JSONSchemaService, ResolvedSchema } from "../jsonSchema"
import {
	CFNLintSettings,
	LanguageSettings,
	ValidationProvider
} from "./../../model/settings"
import { sendAnalytics } from "../analytics"
import { validateReferences } from "./references"
import { removeDuplicatesObj } from "../../utils/arrayUtils"
import { IProblem, ProblemSeverity } from "../../parser/json/validation-result"

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
				await this.validateWithCfnLint(textDocument)
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

				this.sendDiagnostics(textDocument.uri, diagnostics)
				resolve()
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
		yamlDocument: YAMLDocument,
		documentSchema?: ResolvedSchema
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
			const currentDocProblems = await yamlDocument.getValidationProblems(
				schema.schema
			)
			currentDocProblems.push(
				...(await yamlDocument.validateSubStackImports())
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

				const documentProblem: Problem = {
					location: {
						start: problem.location.start,
						end: problem.location.end
					},
					message: problem.message,
					code: ErrorCode.Undefined
				}

				if (problem.severity === ProblemSeverity.Error) {
					yamlDocument.errors.push(documentProblem)
				} else {
					yamlDocument.warnings.push(documentProblem)
				}
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

		this.sendDiagnostics(textDocument.uri, diagnostics)
	}

	sendValidationProblems(textDocument: TextDocument, problems: IProblem[]) {
		this.sendDiagnostics(
			textDocument.uri,
			problems.map(({ severity, location, message }: IProblem) => ({
				severity:
					severity === ProblemSeverity.Error
						? DiagnosticSeverity.Error
						: DiagnosticSeverity.Warning,
				range: {
					start: textDocument.positionAt(location.start),
					end: textDocument.positionAt(location.end)
				},
				message: `[Serverless IDE] ${message}`
			}))
		)
	}

	private sendDiagnostics(uri: string, diagnostics: Diagnostic[]) {
		this.connection.sendDiagnostics({
			uri,
			diagnostics: removeDuplicatesObj(diagnostics)
		})
	}
}
