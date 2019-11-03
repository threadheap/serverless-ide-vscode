import { parse as parseYAML } from "@serverless-ide/config"
import { TextDocument } from "vscode-languageserver"

import { JSONSchemaService } from "../../jsonSchema"
import { YAMLCompletion } from "./../index"

const schemaService = new JSONSchemaService()
const completionProvider = new YAMLCompletion(schemaService)

const RESOURCES_TEMPLATE = `
service:
  name: myService
provider:
  name: aws
resources:
  Resources:
    
`

describe("Serverless Framework autocompletion", () => {
	describe("doComplete", () => {
		const setup = (content: string) => {
			return TextDocument.create(
				"file://~/Desktop/serverless.yml",
				"yaml",
				0,
				content
			)
		}

		const parseSetup = async (content: string, offset: number) => {
			const testTextDocument = setup(content)
			const position = testTextDocument.positionAt(offset)

			return await completionProvider.doComplete(
				testTextDocument,
				position,
				parseYAML(testTextDocument)
			)
		}

		test("should autocomplete resources", async () => {
			const content = RESOURCES_TEMPLATE
			const result = await parseSetup(content, content.length - 1)

			expect(result.items).not.toHaveLength(0)
			expect(result).toMatchSnapshot()
		})
	})
})
