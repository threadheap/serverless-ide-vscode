import { TextDocument } from "vscode-languageserver"
import { getLanguageService } from "../languageService"
import {
	getDefaultLanguageSettings,
	ValidationProvider
} from "../model/settings"
import { parse as parseYAML } from "../parser"
import { LanguageService } from "./../languageService"
import { LanguageSettings } from "./../model/settings"

// Tests for validator
describe("Validation", () => {
	let languageService: LanguageService
	let languageSettings: LanguageSettings

	const setup = (content: string) => {
		return TextDocument.create(
			"file://~/Desktop/sam.yaml",
			"yaml",
			0,
			content
		)
	}

	const parseSetup = (content: string) => {
		const testTextDocument = setup(content)
		const yDoc = parseYAML(testTextDocument.getText())
		return languageService.doValidation(testTextDocument, yDoc)
	}
	;["default", "cfn-lint"].forEach(validationType => {
		languageSettings = getDefaultLanguageSettings()

		if (validationType === "default") {
			languageSettings.validationProvider = ValidationProvider.default
		}
		languageService = getLanguageService(languageSettings)

		describe(validationType, () => {
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
		})
	})
})
