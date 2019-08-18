import { TextDocument } from "vscode-languageserver"
import { getLanguageService } from "../languageService"
import { getDefaultLanguageSettings } from "../model/settings"
import { parse as parseYAML } from "../parser"

const languageSettings = getDefaultLanguageSettings()
const languageService = getLanguageService(languageSettings)

describe("Document Symbols Tests", () => {
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
		const jsonDocument = parseYAML(testTextDocument.getText())
		return languageService.findDocumentSymbols(
			testTextDocument,
			jsonDocument
		)
	}

	it("Document is empty", done => {
		const content = ""
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(0)
		done()
	})

	it("Simple document symbols", done => {
		const content = "cwd: test"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with number", done => {
		const content = "node1: 10000"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with boolean", done => {
		const content = "node1: False"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with object", done => {
		const content = "scripts:\n  node1: test\n  node2: test"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with null", done => {
		const content = "apiVersion: null"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with array of strings", done => {
		const content = "items:\n  - test\n  - test"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with array", done => {
		const content = "authors:\n  - name: Josh\n  - email: jp"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(1)
		done()
	})

	it("Document Symbols with object and array", done => {
		const content =
			"scripts:\n  node1: test\n  node2: test\nauthors:\n  - name: Josh\n  - email: jp"
		const symbols = parseSetup(content)
		expect(symbols).toHaveLength(2)
		done()
	})
})
