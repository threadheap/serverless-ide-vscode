import { TextDocument, IConnection, Diagnostic } from "vscode-languageserver"
import {
	getDefaultLanguageSettings,
	ValidationProvider
} from "../../../model/settings"
import { parse as parseYAML } from "../../../parser"
import { LanguageSettings } from "../../../model/settings"
import { JSONSchemaService } from "../../jsonSchema"
import { YAMLValidation } from ".."

const schemaService = new JSONSchemaService()

// Tests for validator
describe("Validation", () => {
	const mockSendDiagnostics = jest.fn()
	const mockConnection = {
		sendDiagnostics: mockSendDiagnostics
	}
	let languageSettings: LanguageSettings
	const validationProvider = new YAMLValidation(
		schemaService,
		"",
		(mockConnection as unknown) as IConnection
	)

	const setup = (content: string) => {
		return TextDocument.create(
			"file://~/Desktop/sam.yaml",
			"yaml",
			0,
			content
		)
	}

	const parseSetup = async (content: string) => {
		mockConnection.sendDiagnostics.mockClear()

		const testTextDocument = setup(content)
		const yDoc = parseYAML(testTextDocument)
		await validationProvider.doValidation(testTextDocument, yDoc)
		return mockConnection.sendDiagnostics.mock.calls[0][0]
			.diagnostics as Diagnostic[]
	}
	describe("default", () => {
		beforeEach(() => {
			languageSettings = getDefaultLanguageSettings()

			languageSettings.validationProvider = ValidationProvider.default
			validationProvider.configure(languageSettings)
		})

		test("does basic validation for empty file", async () => {
			const content = ""
			const result = await parseSetup(content)
			expect(result).toHaveLength(1)
		})

		test("does basic validation for cloud formation template", async () => {
			const content = [
				"Resources:",
				"  Table:",
				"    Type: AWS::DynamoDB::Table"
			].join("\n")

			const result = await parseSetup(content)
			expect(result).not.toHaveLength(0)
			expect(result).toMatchSnapshot()
		})

		test("does basic validation for sam template", async () => {
			const content = [
				"Transform: AWS::Serverless-2016-10-31",
				"Resources:",
				"  Table:",
				"    Type: AWS::DynamoDB::Table"
			].join("\n")

			const result = await parseSetup(content)
			expect(result).not.toHaveLength(0)
			expect(result).toMatchSnapshot()
		})

		test("should considers globals for sam template", async () => {
			const content = [
				"Transform: AWS::Serverless-2016-10-31",
				"Globals:",
				"  Function:",
				"    Runtime: nodejs8.10",
				"Resources:",
				"  Function:",
				"    Type: AWS::Serverless::Function",
				"    Properties:",
				"      Handler: index.default",
				"      CodeUri: ."
			].join("\n")

			const result = await parseSetup(content)
			expect(result).toHaveLength(0)
		})

		test("should validation references", async () => {
			const content = [
				"Transform: AWS::Serverless-2016-10-31",
				"Globals:",
				"  Function:",
				"    Runtime: nodejs8.10",
				"Resources:",
				"  Function:",
				"    Type: AWS::Serverless::Function",
				"    Properties:",
				"      Handler: index.default",
				"      CodeUri: !Ref MyTable",
				"  MyTable:",
				"    Type: AWS::DynamoDB::Table",
				"    Properties:",
				"      KeySchema: !Sub Function",
				"      AttributeDefinitions:",
				"         - AttributeName: id",
				"           AttributeType: S"
			].join("\n")

			const result = await parseSetup(content)
			expect(result).toHaveLength(1)
		})
	})
})
