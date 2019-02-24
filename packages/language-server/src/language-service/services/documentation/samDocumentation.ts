import {
	Specification,
	PropertySpecification,
	STRING_TYPE,
	INTEGER_TYPE,
	BOOLEAN_TYPE,
	MAP_TYPE,
	LIST_TYPE
} from './model';

const S3LocationObject: PropertySpecification = {
	Documentation:
		'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#s3-location-object',
	Properties: {
		Bucket: {
			PrimitiveType: STRING_TYPE,
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#s3-location-object',
			Required: true
		},
		Key: {
			PrimitiveType: STRING_TYPE,
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#s3-location-object',
			Required: true
		},
		Version: {
			PrimitiveType: STRING_TYPE,
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#s3-location-object',
			Required: true
		}
	}
};

const samSpecification: Specification = {
	ResourceTypes: {
		'AWS::Serverless::API': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
			Properties: {
				Name: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				StageName: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				DefinitionUri: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: STRING_TYPE,
					Type: 'DefinitionUri',
					Required: false
				},
				DefinitionBody: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				CacheClusterEnabled: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: BOOLEAN_TYPE,
					Required: false
				},
				CacheClusterSize: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				Variables: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				MethodSettings: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					Type: 'AWS::ApiGateway::Stage.MethodSetting',
					Required: false
				},
				EndpointConfiguration: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				BinaryMediaTypes: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveItemType: STRING_TYPE,
					Type: LIST_TYPE,
					Required: false
				},
				Cors: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					PrimitiveItemType: STRING_TYPE,
					Type: 'CorsConfiguration',
					Required: false
				},
				Auth: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapi',
					Type: 'Auth',
					Required: false
				}
			},
			Attributes: {
				Ref: {
					PrimitiveType: STRING_TYPE
				}
			}
		},
		'AWS::Serverless::Application': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
			Properties: {
				Location: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
					Type: 'Location',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				Parameters: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				NotificationArns: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
					PrimitiveItemType: STRING_TYPE,
					Type: LIST_TYPE,
					Required: false
				},
				Tags: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
					PrimitiveItemType: STRING_TYPE,
					Type: MAP_TYPE,
					Required: false
				},
				TimeoutInMinutes: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessapplication',
					PrimitiveItemType: INTEGER_TYPE,
					Required: false
				}
			},
			Attributes: {
				Ref: {
					PrimitiveType: STRING_TYPE
				}
			}
		},
		'AWS::Serverless::SimpleTable': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesssimpletable',
			Properties: {
				PrimaryKey: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesssimpletable',
					Type: 'PrimaryKey',
					Required: false
				},
				ProvisionedThroughput: {
					Documentation:
						'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-provisionedthroughput.html',
					Type: 'AWS::DynamoDB::Table.ProvisionedThroughput',
					Required: false
				},
				Tags: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesssimpletable',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				TableName: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesssimpletable',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				SSESpecification: {
					Documentation:
						'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dynamodb-table-ssespecification.html',
					Type: 'AWS::DynamoDB::Table.SSESpecification',
					Required: false
				}
			},
			Attributes: {
				Ref: {
					PrimitiveType: STRING_TYPE
				}
			}
		},
		'AWS::Serverless::LayerVersion': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
			Properties: {
				LayerName: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				Description: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				ContentUri: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					Type: 'ContentUri',
					Required: false
				},
				CompatibleRuntimes: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					Type: LIST_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				LicenseInfo: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				RetentionPolicy: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlesslayerversion',
					PrimitiveType: STRING_TYPE,
					Required: false
				}
			},
			Attributes: {
				Ref: {
					PrimitiveType: STRING_TYPE
				}
			}
		},
		'AWS::Serverless::Function': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
			Properties: {
				Handler: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				Runtime: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				CodeUri: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: 'CodeUri',
					Required: false
				},
				InlineCode: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				FunctionName: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				Description: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				MemorySize: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: INTEGER_TYPE,
					Required: false
				},
				Timeout: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: INTEGER_TYPE,
					Required: false
				},
				Role: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				Policies: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: 'Policies',
					Required: false
				},
				Environment: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: 'Environment',
					Required: false
				},
				VpcConfig: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: 'AWS::Lambda::Function.VpcConfig',
					Required: false
				},
				Events: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: MAP_TYPE,
					ItemType: 'EventSourceObject',
					Required: false
				},
				Tags: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				},
				Tracing: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				KmsKeyArn: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				DeadLetterQueue: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#deadletterqueue-object',
					Type: MAP_TYPE,
					ItemType: 'DeadLetterQueue',
					Required: false
				},
				DeploymentPreference: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#deploymentpreference-object',
					Type: MAP_TYPE,
					ItemType: 'DeploymentPreference',
					Required: false
				},
				Layers: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveItemType: STRING_TYPE,
					Type: LIST_TYPE,
					Required: false
				},
				AutoPublishAlias: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				ReservedConcurrentExecutions: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction',
					PrimitiveType: INTEGER_TYPE,
					Required: false
				}
			},
			Attributes: {
				Ref: {
					PrimitiveType: STRING_TYPE
				}
			}
		}
	},
	PropertyTypes: {
		'AWS::Serverless::API.DefinitionUri': S3LocationObject,
		'AWS::Serverless::API.CorsConfiguration': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#cors-configuration',
			Properties: {
				AllowMethods: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#cors-configuration',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				AllowHeaders: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#cors-configuration',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				AllowOrigin: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#cors-configuration',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				MaxAge: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#cors-configuration',
					PrimitiveType: STRING_TYPE,
					Required: false
				}
			}
		},
		'AWS::Serverless::API.Auth': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api-auth-object',
			Properties: {
				DefaultAuthorizer: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api-auth-object',
					PrimitiveType: STRING_TYPE,
					Required: false
				},
				Authorizers: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api-auth-object',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: false
				}
			}
		},
		'AWS::Serverless::Application.Location': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#application-location-object',
			Properties: {
				ApplicationId: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#application-location-object',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				SemanticVersion: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#application-location-object',
					PrimitiveType: STRING_TYPE,
					Required: true
				}
			}
		},
		'AWS::Serverless::SimpleTable.PrimaryKey': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#primary-key-object',
			Properties: {
				Name: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#primary-key-object',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				Type: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#primary-key-object',
					PrimitiveType: STRING_TYPE,
					Required: true
				}
			}
		},
		'AWS::Serverless::LayerVersion.ContentUri': S3LocationObject,
		'AWS::Serverless::Function.CodeUri': S3LocationObject,
		'AWS::Serverless::Function.Environment': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#environment-object',
			Properties: {
				Variables: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#environment-object',
					Type: MAP_TYPE,
					PrimitiveItemType: STRING_TYPE,
					Required: true
				}
			}
		},
		'AWS::Serverless::Function.EventSourceObject': {
			Documentation:
				'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#event-source-object',
			Properties: {
				Type: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#event-source-object',
					PrimitiveType: STRING_TYPE,
					Required: true
				},
				Properties: {
					Documentation:
						'https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#event-source-object',
					Type: MAP_TYPE,
					ItemType: 'EventSourceObject',
					Required: true
				}
			}
		}
	}
};

export default samSpecification;
