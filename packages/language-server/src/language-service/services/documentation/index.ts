import requestService from '../requestService';
import {
	Specification,
	ResourceSpecification,
	ItemType,
	PropertySpecification,
	Property
} from './model';
import Cache = require('lru-cache');
import map = require('lodash/map');

const getItemType = (item: ItemType, docsUrl?: string): string => {
	const wrap = (typeName: string) => {
		if (docsUrl) {
			return `[${typeName}](${docsUrl})`;
		}
		return typeName;
	};

	if (item.Type === 'List') {
		return `[ ${wrap(item.PrimitiveItemType || item.ItemType)} ]`;
	} else {
		return wrap(item.PrimitiveType || item.Type);
	}
};

export class DocumentationService {
	private sourceUrl: string;
	private sourcePromise: Promise<Specification>;
	private cache: Cache.Cache<string, string> = new Cache({
		max: 500
	});

	constructor(sourceUrl: string) {
		this.sourceUrl = sourceUrl;
		this.sourcePromise = this._getSource();
	}

	private async _getSource(): Promise<Specification> {
		const docStr = await requestService(this.sourceUrl);

		try {
			return JSON.parse(docStr) as Specification;
		} catch (err) {
			return {
				PropertyTypes: {},
				ResourceTypes: {}
			};
		}
	}

	private async getResource(
		resourceType: string
	): Promise<ResourceSpecification | void> {
		const specifications = await this.sourcePromise;

		return specifications.ResourceTypes[resourceType];
	}

	private async getProperty(
		propertyName: string
	): Promise<PropertySpecification | void> {
		const specifications = await this.sourcePromise;

		return specifications.PropertyTypes[propertyName];
	}

	private async getPropertyTypeDocumentation(
		resourceType: string,
		propertyName: string,
		property: Property
	): Promise<string> {
		const typeName = property.Type || property.ItemType;

		if (typeName && typeName !== 'List') {
			const propertySpecification = await this.getProperty(
				`${resourceType}.${propertyName}`
			);

			if (propertySpecification) {
				return getItemType(
					property,
					propertySpecification.Documentation
				);
			}
		}

		return getItemType(property);
	}

	async getPropertyDocumentation(
		resourceType: string,
		propertyName: string
	): Promise<string | void> {
		const fullPropertyName = `${resourceType}.${propertyName}`;

		const resource = await this.getResource(resourceType);
		const property = await this.getProperty(fullPropertyName);

		if (resource && property) {
			return [
				`[${resourceType}](${
					resource.Documentation
				}) / Properties / [${propertyName}](${property.Documentation})`,
				'\n',
				'-----',
				map(
					property.Properties,
					(nestedProperty, nestedPropertyName) => {
						return `- [${nestedPropertyName}](${
							nestedProperty.Documentation
						}): ${getItemType(nestedProperty)}`;
					}
				).join('\n')
			].join('\n');
		}
	}

	async getResourceDocumentation(
		resourceType: string
	): Promise<string | void> {
		if (this.cache.has(resourceType)) {
			return this.cache.get(resourceType);
		}

		try {
			const resource = await this.getResource(resourceType);

			if (resource) {
				const properties = (await Promise.all(
					map(resource.Properties, async (value, name) => {
						return `- [${name}](${
							value.Documentation
						}): ${await this.getPropertyTypeDocumentation(
							resourceType,
							name,
							value
						)}`;
					})
				)).join(`\n`);

				const attributes = map(resource.Attributes, (value, name) => {
					return `- ${name}: ${getItemType(value)}`;
				}).join('\n');

				const markdown = [
					`[${resourceType}](${resource.Documentation}) / Properties`,
					'\n',
					'-----',
					properties,
					'-----',
					'Attributes:',
					attributes
				].join('\n');

				this.cache.set(resourceType, markdown);

				return markdown;
			}
		} catch (err) {
			return;
		}
		return;
	}
}
