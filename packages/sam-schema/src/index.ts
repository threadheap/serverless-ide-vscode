'use strict';

import request = require('request-promise');
import fs = require('fs');
import path = require('path');
import pick = require('lodash/pick');

const downloadSchema = async (): Promise<object> => {
    const response = await request.get(
        'https://raw.githubusercontent.com/awslabs/goformation/master/schema/sam.schema.json',
        {json: true}
    );

    return response;
};

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

const generateSchema = (schema: any): any => {
    if (!schema.properties.Globals) {
        const functionDefinition =
            schema.definitions['AWS::Serverless::Function'];
        const functionProperties =
            functionDefinition.properties.Properties.properties;
        const apiDefinition = schema.definitions['AWS::Serverless::Api'];
        const apiProperties = apiDefinition.properties.Properties.properties;
        const tableDefinition =
            schema.definitions['AWS::Serverless::SimpleTable'];
        const tableProperties =
            tableDefinition.properties.Properties.properties;

        // Global CodeUri is not yet supported by cloudformation package
        // functionDefinition.required = functionDefinition.required.filter(
        //     (option: string) => option !== 'CodeUri'
        // );

        schema.properties.Globals = {
            type: 'object',
            additionalProperties: false,
            properties: {
                Api: {
                    type: "object",
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
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        ...pick(functionProperties, globalFunctionProperties)
                    }
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
    }

    return schema;
};

const main = async () => {
    const schema = await downloadSchema();

    fs.writeFileSync(
        path.join(process.cwd(), 'schema.json'),
        JSON.stringify(generateSchema(schema), null, 4),
        'utf-8'
    );
};

main();
