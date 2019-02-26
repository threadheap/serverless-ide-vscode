import { Specification } from './../model';
import { DocumentationService } from './../index';
import map = require('lodash/map');

const docUrl =
	'https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json';

describe('DocumentationService', () => {
	describe('e2e', () => {
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

		test('should return docs for sam resources', async () => {
			const docs = await service.getResourceDocumentation(
				'AWS::Serverless::Function'
			);

			expect(docs).toMatchSnapshot();
		});
	});

	describe('smoke tests', () => {
		let service: DocumentationService = void 0;
		let specifications: Specification = void 0;

		beforeEach(async () => {
			service = new DocumentationService(docUrl);
			specifications = await service.sourcePromise;
		});

		test('should contain resources and properties', () => {
			expect(
				Object.keys(specifications.ResourceTypes).length
			).toBeGreaterThan(0);
			expect(
				Object.keys(specifications.PropertyTypes).length
			).toBeGreaterThan(0);
		});

		test('should return documentation for resources', async () => {
			await Promise.all(
				map(
					specifications.ResourceTypes,
					async (resource, resourceType) => {
						const doc = await service.getResourceDocumentation(
							resourceType
						);

						expect(doc).toBeDefined();

						await Promise.all(
							map(
								resource.Properties,
								async (property, propertyName) => {
									const propertyDoc = await service.getPropertyDocumentation(
										resourceType,
										propertyName
									);

									expect(propertyDoc).toBeDefined();
								}
							)
						);
					}
				)
			);
		});
	});
});
