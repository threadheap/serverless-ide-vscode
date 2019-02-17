'use strict';

import request = require('request-promise');
import fs = require('fs');
import path = require('path');
import cloneDeep = require('lodash/cloneDeep');
import pick = require('lodash/pick');
import stringify = require('json-stable-stringify');

const cfnSchemaUrl =
	'https://raw.githubusercontent.com/awslabs/goformation/master/schema/cloudformation.schema.json';
const samSchemaUrl =
	'https://raw.githubusercontent.com/awslabs/serverless-application-model/master/samtranslator/validator/sam_schema/schema.json';

const cfnResourceDefinition = 'CloudFormationResource';
const cfnResourceDefinitionLink = `#/definitions/${cfnResourceDefinition}`;

// https://github.com/awslabs/serverless-application-model/blob/master/docs/globals.rst
// supported properties
const globalFunctionProperties = [
	'Handler',
	'Runtime',
	// Global CodeUri is not yet supported by cloudformation package
	'CodeUri',
	'DeadLetterQueue',
	'Description',
	'MemorySize',
	'Timeout',
	'VpcConfig',
	'Environment',
	'Tags',
	'Tracing',
	'KmsKeyArn',
	'Layers',
	'AutoPublishAlias',
	'DeploymentPreference'
];

const globalApiProperties = [
	'Name',
	'DefinitionUri',
	'CacheClusterEnabled',
	'CacheClusterSize',
	'Variables',
	'EndpointConfiguration',
	'MethodSettings',
	'BinaryMediaTypes',
	'Cors'
];

const globalTableProperties = ['SSESpecification'];

const downloadSchema = async (url: string): Promise<object> => {
	const response = await request.get(url, { json: true });

	return response;
};

const mergeSchemas = (cfnSchema: any, samSchema: any): any => {
	const functionDefinition =
		samSchema.definitions['AWS::Serverless::Function'];
	const functionProperties = cloneDeep(
		functionDefinition.properties.Properties
	);
	const apiDefinition = samSchema.definitions['AWS::Serverless::Api'];
	const apiProperties = apiDefinition.properties.Properties.properties;
	const tableDefinition =
		samSchema.definitions['AWS::Serverless::SimpleTable'];
	const tableProperties = tableDefinition.properties.Properties.properties;

	const schema = cloneDeep(cfnSchema);

	schema.definitions = Object.assign(
		schema.definitions,
		samSchema.definitions
	);

	delete schema.definitions[cfnResourceDefinition];

	let cfnResources =
		schema.properties.Resources.patternProperties['^[a-zA-Z0-9]+$'].anyOf;
	const samResources =
		samSchema.properties.Resources.patternProperties['^[a-zA-Z0-9]+$']
			.anyOf;

	samResources.map((resource: any) => {
		if (resource.$ref !== cfnResourceDefinitionLink) {
			cfnResources.push(resource);
		}
	});

	// Globals
	delete functionProperties.allOf[1].required;

	schema.properties.Globals = {
		type: 'object',
		additionalProperties: false,
		properties: {
			Api: {
				type: 'object',
				additionalProperties: false,
				properties: {
					EndpointConfiguration: {
						$ref:
							'#/definitions/AWS::ApiGateway::DomainName.EndpointConfiguration'
					},
					MethodSettings: {
						items: {
							$ref:
								'#/definitions/AWS::ApiGateway::Stage.MethodSetting'
						},
						type: 'array'
					},
					BinaryMediaTypes: {
						items: {
							type: 'string'
						},
						type: 'array'
					},
					...pick(apiProperties, globalApiProperties)
				}
			},
			Function: {
				type: 'object',
				additionalProperties: false,
				...functionProperties
			},
			SimpleTable: {
				type: 'object',
				additionalProperties: false,
				properties: {
					SSESpecification: {
						$ref: '#/definitions/AWS::DAX::Cluster.SSESpecification'
					},
					...pick(tableProperties, globalTableProperties)
				}
			}
		}
	};

	schema.properties.Transform = samSchema.properties.Transform;

	if (schema.required.indexOf('Transform') === -1) {
		schema.required.push('Transform');
	}

	return schema;
};

const main = async () => {
	const cfnSchema = await downloadSchema(cfnSchemaUrl);
	const samSchema = await downloadSchema(samSchemaUrl);

	fs.writeFileSync(
		path.join(process.cwd(), 'schema.json'),
		stringify(mergeSchemas(cfnSchema, samSchema), { space: 4 }),
		'utf-8'
	);
};

main();
