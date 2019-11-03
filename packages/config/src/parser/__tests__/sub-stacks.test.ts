import { TextDocument } from "vscode-languageserver"

import { parse as parseYaml } from ".."

const templateWithSubStack = `
Transform: AWS::Serverless-2016-10-31
Resources:
    One:
        Type: AWS::CloudFormation::Stack
        Properties:
            TemplateURL: ./index.yaml
`

const templateWithMultipleSubStacks = `
Transform: AWS::Serverless-2016-10-31
Resources:
    One:
        Type: AWS::CloudFormation::Stack
        Properties:
            TemplateURL: ./index.yaml
    Two:
        Type: AWS::Serverless::Application
        Properties:
            Location: ../my-other-app/template.yaml
`
const templateWithRemoteSubStack = `
Transform: AWS::Serverless-2016-10-31
Resources:
    One:
        Type: AWS::CloudFormation::Stack
        Properties:
            TemplateURL: https://s3.amazonaws.com/cloudformation-templates-us-east-2/EC2ChooseAMI.template
    Two:
        Type: AWS::Serverless::Application
        Properties:
        Location:
            ApplicationId: arn:aws:serverlessrepo:us-east-1:123456789012:applications/application-alias-name
            SemanticVersion: 1.0.0
`

test("should collect sub-stacks paths", () => {
	const document = TextDocument.create("", "", 1, templateWithSubStack)
	const doc = parseYaml(document)

	expect(doc.collectSubStacks()).toEqual([
		false,
		[
			{
				path: "./index.yaml",
				node: expect.any(Object)
			}
		]
	])
})

test("should collect multiple sub stacks", () => {
	const document = TextDocument.create(
		"",
		"",
		1,
		templateWithMultipleSubStacks
	)
	const doc = parseYaml(document)

	expect(doc.collectSubStacks()).toEqual([
		false,
		[
			{ path: "./index.yaml", node: expect.any(Object) },
			{ path: "../my-other-app/template.yaml", node: expect.any(Object) }
		]
	])
})

test("should not collect remote sub stacks", () => {
	const document = TextDocument.create("", "", 1, templateWithRemoteSubStack)
	const doc = parseYaml(document)

	expect(doc.collectSubStacks()).toEqual([true, []])
})
