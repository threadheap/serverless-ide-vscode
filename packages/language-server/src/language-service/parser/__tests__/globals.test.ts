import { collectGlobals } from './../globals';
import { parse as parseYaml } from '..';

const noGlobals = `
Resources:
    fuuu
`;

const fullyDefinedGlobals = `
Globals:
    Function:
        Runtime: nodejs8.10
        Handler: index.handler
    Api:
        Name: my-api
        DefinitionUrl: url
    SimpleTable:
        SSESpecification: 1
`;

const partiallyDefinedGlobals = `
Globals:
    Function:
        Runtime: 
    Api:
        Name: my-api
        DefinitionUrl:
`;

const invalidGlobals = `
Globals: some-string
`;

const globalsWithOtherProperties = `
Transform: AWS::Serverless-2016-10-31
Globals:
    Function:
        Runtime: nodejs8.10
        Handler: index.handler
    Api:
        Name: my-api
        DefinitionUrl: url
    SimpleTable:
        SSESpecification: 1
Resources:
    One:
        Type: AWS::Serverless::Function
`;

test('should collect globals for empty doc', () => {
	const doc = parseYaml(noGlobals);

	expect(collectGlobals(doc.documents[0].root)).toEqual({
		Api: {
			resourceType: 'AWS::Serverless::Api',
			properties: []
		},
		Function: {
			resourceType: 'AWS::Serverless::Function',
			properties: []
		},
		SimpleTable: {
			resourceType: 'AWS::Serverless::SimpleTable',
			properties: []
		}
	});
});

test('should collect globals for fully defined globals doc', () => {
	const doc = parseYaml(fullyDefinedGlobals);

	expect(collectGlobals(doc.documents[0].root)).toEqual({
		Api: {
			resourceType: 'AWS::Serverless::Api',
			properties: ['Name', 'DefinitionUrl']
		},
		Function: {
			resourceType: 'AWS::Serverless::Function',
			properties: ['Runtime', 'Handler']
		},
		SimpleTable: {
			resourceType: 'AWS::Serverless::SimpleTable',
			properties: ['SSESpecification']
		}
	});
});

test('should collect globals for partially defined globals doc', () => {
	const doc = parseYaml(partiallyDefinedGlobals);

	expect(collectGlobals(doc.documents[0].root)).toEqual({
		Api: {
			resourceType: 'AWS::Serverless::Api',
			properties: ['Name', 'DefinitionUrl']
		},
		Function: {
			resourceType: 'AWS::Serverless::Function',
			properties: ['Runtime']
		},
		SimpleTable: {
			resourceType: 'AWS::Serverless::SimpleTable',
			properties: []
		}
	});
});

test('should collect globals from invalid globals node', () => {
	const doc = parseYaml(invalidGlobals);

	expect(collectGlobals(doc.documents[0].root)).toEqual({
		Api: {
			resourceType: 'AWS::Serverless::Api',
			properties: []
		},
		Function: {
			resourceType: 'AWS::Serverless::Function',
			properties: []
		},
		SimpleTable: {
			resourceType: 'AWS::Serverless::SimpleTable',
			properties: []
		}
	});
});

test('should collect globals with other properties', () => {
	const doc = parseYaml(globalsWithOtherProperties);

	expect(collectGlobals(doc.documents[0].root)).toEqual({
		Api: {
			resourceType: 'AWS::Serverless::Api',
			properties: ['Name', 'DefinitionUrl']
		},
		Function: {
			resourceType: 'AWS::Serverless::Function',
			properties: ['Runtime', 'Handler']
		},
		SimpleTable: {
			resourceType: 'AWS::Serverless::SimpleTable',
			properties: ['SSESpecification']
		}
	});
});
