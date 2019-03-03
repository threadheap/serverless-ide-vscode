import { TextDocument } from "vscode-languageserver"
import { getLanguageService } from "../languageService"
import { parse as parseYAML } from "../parser"
import { workspaceContext } from "./testHelper"

const languageService = getLanguageService(workspaceContext, [])

const uri = "SchemaDoesNotExist"
const languageSettings = {
	schemas: [],
	validate: true,
	customTags: []
}
const fileMatch = ["*.yml", "*.yaml"]
languageSettings.schemas.push({ uri, fileMatch })
languageService.configure(languageSettings)

// Tests for validator
describe("Validation", () => {
	function setup(content: string) {
		return TextDocument.create(
			"file://~/Desktop/vscode-k8s/test.yaml",
			"yaml",
			0,
			content
		)
	}

	function parseSetup(content: string) {
		const testTextDocument = setup(content)
		const yDoc = parseYAML(
			testTextDocument.getText(),
			languageSettings.customTags
		)
		return languageService.doValidation(testTextDocument, yDoc)
	}

	// Validating basic nodes
	describe("Test that validation throws error when schema is not found", () => {
		test("Basic test", done => {
			const content = `testing: true`
			const validator = parseSetup(content)
			validator
				.then(result => {
					expect(result).not.toHaveLength(0)
				})
				.then(done, done)
		})
	})
})
