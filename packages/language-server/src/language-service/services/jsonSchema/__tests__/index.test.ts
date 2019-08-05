import { TextDocument } from "vscode-languageserver"
import { YAMLDocument } from "../../../parser"
import { JSONSchemaService } from "./../index"

const slsTemplate = `
service:
    name: my-service
provider:
    name: aws
Resources:
    Table:
        Type: AWS::DynamoDB::Table
`

const cfnTemplate = `
Resources:
    DomainName:
        Type: AWS::ApiGateway::DomainName
        Properties:
            DomainName: blah.example.com
`

const samTemplate = `
AWSTemplateFormatVersion: 2010-09-09
Transform: AWS::Serverless-2016-10-31
Globals:
    Function:
        Runtime: nodejs8.10
Resources:
    Function1:
        Type: AWS::Serverless::Function
        Properties:
            CodeUri: .
            Handler: index.handler
`

test("should resolve CloudFormation schema", async () => {
	const service = new JSONSchemaService()
	const document = TextDocument.create("cfn", "yaml", 1, cfnTemplate)

	const schema = await service.getSchemaForDocument(
		document,
		new YAMLDocument([])
	)

	expect(schema).toBeDefined()

	if (schema) {
		expect(schema.schema).toBeDefined()
		expect(schema.errors).toHaveLength(0)
	}
})

test("should resolve SAM schema", async () => {
	const service = new JSONSchemaService()
	const document = TextDocument.create("sam", "yaml", 1, samTemplate)

	const schema = await service.getSchemaForDocument(
		document,
		new YAMLDocument([])
	)

	expect(schema).toBeDefined()

	if (schema) {
		expect(schema.schema).toBeDefined()
		expect(schema.errors).toHaveLength(0)
	}
})

test("should return Serverless schema for sls document", async () => {
	const service = new JSONSchemaService()
	const document = TextDocument.create("sls", "yaml", 1, slsTemplate)

	const schema = await service.getSchemaForDocument(
		document,
		new YAMLDocument([])
	)

	if (schema) {
		expect(schema).toBeDefined()
		expect(schema.errors).toHaveLength(0)
	}
})
