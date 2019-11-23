import { TextDocument } from "vscode-languageserver"

import { DocumentType } from "../../../model/document"
import { ReferenceEntityType } from "../../../model/references"
import { parse } from "./../../../parser/index"
import { collectReferenceables, generateEmptyReferenceables } from "./../index"

const SAM_DOCUMENT = `
AWSTemplateFormatVersion: 2010-09-09
Transform: AWS::Serverless-2016-10-31
Globals:
  Function:
    Runtime: nodejs8.10
Conditions:
  MyCondition:
    Fn::Equals: [{"Ref" : "EnvType"}, "prod"]
Resources:
  Function:
    Type: AWS::Serverless::Function
    Condition: MyCondition
    Properties:
      CodeUri: blah
      Handler: index.js
`

const EMPTY_SAM_DOCUMENT = `
AWSTemplateFormatVersion: 2010-09-09
Transform: AWS::Serverless-2016-10-31
`

const SERVERLESS_DOCUMENT = `
# serverless.yml

service:
  name: myService

frameworkVersion: '>=1.0.0 <2.0.0'

provider:
  name: aws
  runtime: nodejs10.x
  stage: \${opt:stage, 'dev'}
  region: \${opt:region, 'us-east-1'}

functions:
  myFunction:
    name: provider.stage-lambdaName
    description: my description
    handler: handler.default
    events:
      - http:
          path: users/create
          method: get
          cors: true
          private: true
resources:
  Resources:
    Table:
      Type: AWS::DynamoDB::Table
      Properties:
        KeySchema:
          - AttributeName: ID
            KeyType: S
        AttributeDefinitions:
          - AttributeName: ID
            AttributeType: HASH
`

const EMPTY_SERVERLESS_DOCUMENT = `
# serverless.yml

service:
  name: myService

frameworkVersion: '>=1.0.0 <2.0.0'
`

describe("referenceables", () => {
	const generateDocument = (text: string) => {
		const document = TextDocument.create("", "", 1, text)
		return parse(document)
	}

	describe(DocumentType.SAM, () => {
		test("should collect referenceables", () => {
			const doc = generateDocument(SAM_DOCUMENT)
			const referenceables = collectReferenceables(
				DocumentType.SAM,
				doc.root
			)
			const resources = referenceables.hash[
				ReferenceEntityType.RESOURCE
			].serialize()
			const conditions = referenceables.hash[
				ReferenceEntityType.CONDITION
			].serialize()

			expect(resources).toEqual(
				expect.objectContaining({
					hash: {
						Function: {
							id: "Function",
							node: expect.any(Object),
							entityType: ReferenceEntityType.RESOURCE,
							resourceName: "AWS::Serverless::Function"
						},
						FunctionRole: {
							id: "FunctionRole",
							node: expect.any(Object),
							entityType: ReferenceEntityType.RESOURCE,
							resourceName: "AWS::IAM::Role"
						}
					},
					sequence: ["Function", "FunctionRole"]
				})
			)

			expect(conditions).toEqual(
				expect.objectContaining({
					hash: {
						MyCondition: {
							id: "MyCondition",
							node: expect.any(Object),
							entityType: ReferenceEntityType.CONDITION,
							resourceName: undefined
						}
					}
				})
			)
		})

		test("should return empty array for empty document", () => {
			const doc = generateDocument(EMPTY_SAM_DOCUMENT)
			const referenceables = collectReferenceables(
				DocumentType.SAM,
				doc.root
			)

			expect(referenceables).toEqual(generateEmptyReferenceables())
		})
	})

	describe(DocumentType.SERVERLESS_FRAMEWORK, () => {
		test("should collect referenceables", () => {
			const doc = generateDocument(SERVERLESS_DOCUMENT)
			const referenceables = collectReferenceables(
				DocumentType.SERVERLESS_FRAMEWORK,
				doc.root
			)

			expect(
				referenceables.hash[ReferenceEntityType.RESOURCE].serialize()
			).toEqual(
				expect.objectContaining({
					hash: {
						Table: {
							id: "Table",
							node: expect.any(Object),
							entityType: ReferenceEntityType.RESOURCE,
							resourceName: "AWS::DynamoDB::Table"
						}
					},
					sequence: ["Table"]
				})
			)
		})

		test("should return empty array for empty document", () => {
			const doc = generateDocument(EMPTY_SERVERLESS_DOCUMENT)
			const referenceables = collectReferenceables(
				DocumentType.SERVERLESS_FRAMEWORK,
				doc.root
			)

			expect(referenceables).toEqual(generateEmptyReferenceables())
		})
	})
})
