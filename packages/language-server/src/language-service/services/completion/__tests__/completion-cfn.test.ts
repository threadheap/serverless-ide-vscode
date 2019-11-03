import { parse as parseYAML } from "@serverless-ide/config"
import { TextDocument } from "vscode-languageserver"

import { completionHelper } from "../../../utils/completion-helper"
import { JSONSchemaService } from "./../../jsonSchema/index"
import { YAMLCompletion } from "./../index"

const schemaService = new JSONSchemaService()
const completionProvider = new YAMLCompletion(schemaService)

describe("Auto Completion Tests", () => {
	describe("doComplete", () => {
		const setup = (content: string) => {
			return TextDocument.create(
				"file://~/Desktop/cfn.yaml",
				"yaml",
				0,
				content
			)
		}

		const parseSetup = (content: string, offset: number) => {
			const testTextDocument = setup(content)
			const position = testTextDocument.positionAt(offset)
			const output = completionHelper(testTextDocument, position)

			return completionProvider.doComplete(
				testTextDocument,
				output.newPosition,
				parseYAML(output.newDocument)
			)
		}

		test("should autocomplete on the root node", async () => {
			const content = [
				"AWSTemplateFormatVersion: 2010-09-09",
				"Resources:"
			].join("\n")
			const result = await parseSetup(content, content.length - 1)
			expect(result.items).not.toHaveLength(0)
			expect(result).toMatchSnapshot()
		})

		test("should autocomplete resources", async () => {
			const content = [
				"AWSTemplateFormatVersion: 2010-09-09",
				"Resources:",
				"\t"
			].join("\n\r")
			const result = await parseSetup(content, content.length - 1)
			expect(result.items).not.toHaveLength(0)
			expect(result).toMatchSnapshot()
		})
	})
})
