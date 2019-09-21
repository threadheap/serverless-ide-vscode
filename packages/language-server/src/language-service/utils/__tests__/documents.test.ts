import { DocumentType } from "../../model/document"
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
	expect(getDocumentType(slsTemplate)).toBe(DocumentType.SERVERLESS_FRAMEWORK)
	expect(getDocumentType(cfnTemplate)).toBe(DocumentType.CLOUD_FORMATION)
	expect(getDocumentType(cfnTemplateWithFormatVersion)).toBe(
		DocumentType.CLOUD_FORMATION
	)
	expect(getDocumentType(samTemplate)).toBe(DocumentType.SAM)
})

test("should detect supported documents", () => {
	expect(isSupportedDocument(slsTemplate)).toBe(true)
	expect(isSupportedDocument(cfnTemplate)).toBe(true)
	expect(isSupportedDocument(cfnTemplateWithFormatVersion)).toBe(true)
	expect(isSupportedDocument(samTemplate)).toBe(true)
})
