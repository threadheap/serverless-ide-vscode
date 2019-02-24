import { DocumentationService } from './../index';

const docUrl =
	'https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json';

describe('DocumentationService', () => {
	let service: DocumentationService = void 0;

	beforeEach(() => {
		service = new DocumentationService(docUrl);
	});

	test('should return undefined if documentation source is not found', async () => {
		const brokenService = new DocumentationService('unknown');

		const resourceDoc = await brokenService.getResourceDocumentation(
			'AWS::DynamoDB::Table'
		);
		const propertyDoc = await brokenService.getPropertyDocumentation(
			'AWS::DynamoDB::Table',
			'KeySchema'
		);

		expect(resourceDoc).toBeUndefined();
		expect(propertyDoc).toBeUndefined();
	});

	test('return dynamodb resource documentation', async () => {
		const docs = await service.getResourceDocumentation(
			'AWS::DynamoDB::Table'
		);

		expect(docs).toMatchSnapshot();
	});

	test('should return undefined for non-existing resource', async () => {
		const doc = await service.getResourceDocumentation('unknown');

		expect(doc).toBeUndefined();
	});

	test('should return dynamodb resource documentation', async () => {
		const docs = await service.getPropertyDocumentation(
			'AWS::DynamoDB::Table',
			'KeySchema'
		);

		expect(docs).toMatchSnapshot();
	});

	test('should return undefined if property documentation is not found', async () => {
		const docs1 = await service.getPropertyDocumentation(
			'unknown',
			'KeySchema'
		);

		const docs2 = await service.getPropertyDocumentation(
			'AWS::DynamoDB::Table',
			'unknown'
		);

		expect(docs1).toBeUndefined();
		expect(docs2).toBeUndefined();
	});
});
