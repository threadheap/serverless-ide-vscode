import { TextDocument } from "vscode-languageserver"
import {
	CLOUD_FORMATION,
	SAM,
	SERVERLESS_FRAMEWORK
} from "./../../model/document"
import {
	getDocumentType,
	isCloudFormationTemplate,
	isSAMTemplate,
	isServerlessFrameworkTemplate,
	isSupportedDocument
} from "./../document"

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

const cfnTemplateWithFormatVersion = `
AWSTemplateFormatVersion: 12345
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

test("should check for serverless framework templates", () => {
	expect(isServerlessFrameworkTemplate(slsTemplate)).toBe(true)
	expect(isServerlessFrameworkTemplate(cfnTemplate)).toBe(false)
	expect(isServerlessFrameworkTemplate(cfnTemplateWithFormatVersion)).toBe(
		false
	)
	expect(isServerlessFrameworkTemplate(samTemplate)).toBe(false)
})

test("should check for cfn templates", () => {
	expect(isCloudFormationTemplate(slsTemplate)).toBe(false)
	expect(isCloudFormationTemplate(cfnTemplate)).toBe(true)
	expect(isCloudFormationTemplate(cfnTemplateWithFormatVersion)).toBe(true)
	expect(isCloudFormationTemplate(samTemplate)).toBe(false)
})

test("should check for sam template", () => {
	expect(isSAMTemplate(slsTemplate)).toBe(false)
	expect(isSAMTemplate(cfnTemplate)).toBe(false)
	expect(isSAMTemplate(cfnTemplateWithFormatVersion)).toBe(false)
	expect(isSAMTemplate(samTemplate)).toBe(true)
})

test("should detect document type", () => {
	expect(
		getDocumentType(TextDocument.create("sls", "yaml", 1, slsTemplate))
	).toBe(SERVERLESS_FRAMEWORK)
	expect(
		getDocumentType(TextDocument.create("cfn", "yaml", 1, cfnTemplate))
	).toBe(CLOUD_FORMATION)
	expect(
		getDocumentType(
			TextDocument.create("cfn", "yaml", 1, cfnTemplateWithFormatVersion)
		)
	).toBe(CLOUD_FORMATION)
	expect(
		getDocumentType(TextDocument.create("sam", "yaml", 1, samTemplate))
	).toBe(SAM)
})

test("should detect supported documents", () => {
	expect(
		isSupportedDocument(TextDocument.create("sls", "yaml", 1, slsTemplate))
	).toBe(true)
	expect(
		isSupportedDocument(TextDocument.create("cfn", "yaml", 1, cfnTemplate))
	).toBe(true)
	expect(
		isSupportedDocument(
			TextDocument.create("cfn", "yaml", 1, cfnTemplateWithFormatVersion)
		)
	).toBe(true)
	expect(
		isSupportedDocument(TextDocument.create("sam", "yaml", 1, samTemplate))
	).toBe(true)
})
