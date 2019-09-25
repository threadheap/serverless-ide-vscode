import { TextDocument } from "vscode-languageserver-types"
import { DocumentType } from "../../../../model/document"
import { ResolvedSchema } from "../.."
import { FUNCTION } from "../../../../model/globals"
import { YAMLDocument, parse } from "../../../../parser"
import { applyDocumentMutations } from ".."
import { getDefaultGlobalsConfig } from "../../../../parser/json/globals"

describe("sam", () => {
	test("should do nothing if schema was not resolved", () => {
		const doc = new YAMLDocument(DocumentType.UNKNOWN, undefined)
		doc.globalsConfig = getDefaultGlobalsConfig()

		expect(applyDocumentMutations(undefined, doc)).toBeUndefined()
	})

	test("should return original schema if globals are not defined", () => {
		const emptySchema = {}
		const emptyGlobals = getDefaultGlobalsConfig()
		const resolvedSchema = new ResolvedSchema(emptySchema)
		const doc = new YAMLDocument(DocumentType.UNKNOWN, undefined)
		doc.globalsConfig = emptyGlobals

		expect(applyDocumentMutations(resolvedSchema, doc)).toBe(resolvedSchema)
	})

	test("should return original schema if definitions are defined", () => {
		const schema = {
			definitions: {}
		}
		const emptyGlobals = getDefaultGlobalsConfig()
		const resolvedSchema = new ResolvedSchema(schema)
		const doc = new YAMLDocument(DocumentType.UNKNOWN, undefined)
		doc.globalsConfig = emptyGlobals

		expect(applyDocumentMutations(resolvedSchema, doc)).toBe(resolvedSchema)
	})

	test("should return schema with mutations for existing resource", () => {
		const schema = {
			definitions: {
				"AWS::Serverless::Function": {
					properties: {
						Properties: {
							required: ["Handler", "Runtime"]
						}
					}
				}
			}
		}
		const globals = getDefaultGlobalsConfig()
		globals[FUNCTION].properties = ["Runtime"]
		const resolvedSchema = new ResolvedSchema(schema)
		const doc = new YAMLDocument("", DocumentType.SAM, undefined)
		doc.globalsConfig = globals

		const newResolvedSchema = applyDocumentMutations(
			resolvedSchema,
			doc
		) as ResolvedSchema

		expect(newResolvedSchema).not.toBe(resolvedSchema)
		expect(newResolvedSchema.schema).toEqual({
			definitions: {
				"AWS::Serverless::Function": {
					properties: {
						Properties: {
							required: ["Handler"]
						}
					}
				}
			}
		})
	})
})

describe("serverless framework", () => {
	const templateWithRuntime = `
service:
  name: my-service
provider:
  name: aws
  runtime: nodejs10.x
Resources:
  Table:
  Type: AWS::DynamoDB::Table
`

	const templateWithoutRuntime = `
service:
  name: my-service
provider:
  name: aws
Resources:
  Table:
  Type: AWS::DynamoDB::Table	
`

	test("should apply mutations for serverless document schema", () => {
		const schema = {
			properties: {
				functions: {
					patternProperties: {
						["^[a-zA-Z0-9]+$"]: {
							required: ["handler", "runtime"]
						}
					}
				}
			}
		}
		const document = TextDocument.create("", "", 1, templateWithRuntime)
		const resolvedSchema = new ResolvedSchema(schema)
		const doc = parse(document)

		const newResolvedSchema = applyDocumentMutations(
			resolvedSchema,
			doc
		) as ResolvedSchema

		expect(newResolvedSchema).not.toBe(resolvedSchema)
		expect(newResolvedSchema.schema).toEqual({
			properties: {
				functions: {
					patternProperties: {
						["^[a-zA-Z0-9]+$"]: {
							required: ["handler"]
						}
					}
				}
			}
		})
	})

	test("should do nothing for schema without runtime", () => {
		const schema = {
			properties: {
				functions: {
					patternProperties: {
						["^[a-zA-Z0-9]+$"]: {
							required: ["handler", "runtime"]
						}
					}
				}
			}
		}
		const resolvedSchema = new ResolvedSchema(schema)
		const document = TextDocument.create("", "", 1, templateWithoutRuntime)
		const doc = parse(document)

		const newResolvedSchema = applyDocumentMutations(
			resolvedSchema,
			doc
		) as ResolvedSchema

		expect(newResolvedSchema).not.toBe(resolvedSchema)
		expect(newResolvedSchema.schema).toEqual({
			properties: {
				functions: {
					patternProperties: {
						["^[a-zA-Z0-9]+$"]: {
							required: ["handler", "runtime"]
						}
					}
				}
			}
		})
	})
})
