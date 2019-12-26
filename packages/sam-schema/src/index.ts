"use strict"

import fs = require("fs")
import pick = require("lodash/pick")
import path = require("path")
import { enrichResources } from "@serverless-ide/cloudformation-schema"
import request = require("request-promise")

const downloadSchema = async (): Promise<object> => {
	const response = await request.get(
		"https://raw.githubusercontent.com/awslabs/goformation/master/schema/sam.schema.json",
		{ json: true }
	)

	return response
}

// https://github.com/awslabs/serverless-application-model/blob/master/docs/globals.rst
// supported properties
const globalFunctionProperties = [
	"Handler",
	"Runtime",
	// Global CodeUri is not yet supported by cloudformation package
	"CodeUri",
	"DeadLetterQueue",
	"Description",
	"MemorySize",
	"Timeout",
	"VpcConfig",
	"Environment",
	"Tags",
	"Tracing",
	"KmsKeyArn",
	"Layers",
	"AutoPublishAlias",
	"DeploymentPreference",
	"ProvisionedConcurrencyConfig"
]

const globalApiProperties = [
	"Name",
	"DefinitionUri",
	"CacheClusterEnabled",
	"CacheClusterSize",
	"Variables",
	"EndpointConfiguration",
	"MethodSettings",
	"BinaryMediaTypes",
	"Cors"
]

const globalTableProperties = ["SSESpecification"]

const processEventSources = (definitions: any) => {
	const eventSources = definitions["AWS::Serverless::Function.EventSource"]

	const properties = eventSources.properties

	definitions["AWS::Serverless::Function.EventSource"] = {
		anyOf: properties.Properties.anyOf.map((item: any) => {
			const definitionKey = item.$ref.replace("#/definitions/", "")
			const type = definitionKey
				.replace("AWS::Serverless::Function.", "")
				.replace(/Event$/, "")

			const newDefinition = {
				type: "object",
				additionalProperties: false,
				properties: {
					Properties: definitions[definitionKey],
					Type: {
						type: "string",
						enum: [type]
					}
				},
				required: ["Type", "Properties"]
			}
			definitions[definitionKey] = newDefinition

			return item
		})
	}
}

const generateSchema = (schema: any): any => {
	if (!schema.properties.Globals) {
		const functionDefinition =
			schema.definitions["AWS::Serverless::Function"]
		const functionProperties =
			functionDefinition.properties.Properties.properties
		const apiDefinition = schema.definitions["AWS::Serverless::Api"]
		const apiProperties = apiDefinition.properties.Properties.properties
		const tableDefinition =
			schema.definitions["AWS::Serverless::SimpleTable"]
		const tableProperties = tableDefinition.properties.Properties.properties

		// Global CodeUri is not yet supported by cloudformation package
		// functionDefinition.required = functionDefinition.required.filter(
		//     (option: string) => option !== 'CodeUri'
		// );

		apiProperties.MethodSettings = {
			items: {
				$ref: "#/definitions/AWS::ApiGateway::Stage.MethodSetting"
			},
			type: "array"
		}

		functionProperties.ProvisionedConcurrencyConfig = {
			$ref:
				"#/definitions/AWS::Lambda::Alias.ProvisionedConcurrencyConfiguration"
		}

		schema.properties.Globals = {
			type: "object",
			additionalProperties: false,
			properties: {
				Api: {
					type: "object",
					additionalProperties: false,
					properties: {
						EndpointConfiguration: {
							$ref:
								"#/definitions/AWS::ApiGateway::DomainName.EndpointConfiguration"
						},
						BinaryMediaTypes: {
							items: {
								type: "string"
							},
							type: "array"
						},
						...pick(apiProperties, globalApiProperties)
					}
				},
				Function: {
					type: "object",
					additionalProperties: false,
					properties: {
						...pick(functionProperties, globalFunctionProperties)
					}
				},
				SimpleTable: {
					type: "object",
					additionalProperties: false,
					properties: {
						SSESpecification: {
							$ref:
								"#/definitions/AWS::DAX::Cluster.SSESpecification"
						},
						...pick(tableProperties, globalTableProperties)
					}
				}
			}
		}
	}

	schema.definitions["AWS::Serverless::Function.EC2VPNDescribePolicy"] = {
		additionalProperties: false,
		properties: {},
		type: "object"
	}

	schema.definitions[
		"AWS::Serverless::Function.SAMPolicyTemplate"
	].properties["EC2VPNDescribePolicy"] = {
		$ref: "#/definitions/AWS::Serverless::Function.EC2VPNDescribePolicy"
	}

	processEventSources(schema.definitions)
	enrichResources(schema)

	return schema
}

const main = async () => {
	const schema = await downloadSchema()

	fs.writeFileSync(
		path.join(process.cwd(), "schema.json"),
		JSON.stringify(generateSchema(schema), null, 4),
		"utf-8"
	)
}

main()
