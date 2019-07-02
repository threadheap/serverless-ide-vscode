import map = require("lodash/map")
import Cache = require("lru-cache")
import requestService from "../request"
import {
	ItemType,
	PrimitiveType,
	Property,
	PropertySpecification,
	ResourceSpecification,
	Specification
} from "./model"
import SamSpecification from "./samDocumentation"

const isPropertyKey = (propertyName: string | void): boolean => {
	return propertyName && propertyName.startsWith("AWS::")
}

const getPropertyNameFromKey = (propertyName: string): string => {
	if (isPropertyKey(propertyName)) {
		return propertyName.split(".")[1]
	}

	return propertyName
}

const MAX_PROPERTIES = 6

const getItemType = (item: ItemType, docsUrl?: string): string => {
	const wrap = (typeName?: string, primitiveType?: PrimitiveType) => {
		let typeNameStr = ""
		let primitiveTypeStr = ""

		if (typeName && primitiveType) {
			primitiveTypeStr = ` | \`${primitiveType}\``
			typeNameStr = getPropertyNameFromKey(typeName)
		} else if (primitiveType) {
			primitiveTypeStr = ` \`${primitiveType}\``
		} else if (typeName) {
			typeNameStr = getPropertyNameFromKey(typeName)
		}

		if (docsUrl && typeNameStr) {
			return `[\`${typeNameStr}\`](${docsUrl})${primitiveTypeStr}`
		}
		return `\`${typeNameStr}\`${primitiveTypeStr}`
	}

	if (item.Type === "List") {
		return `[ ${wrap(item.ItemType, item.PrimitiveItemType)} ]`
	} else if (item.Type === "Map") {
		return `{[key: String]: ${wrap(item.ItemType, item.PrimitiveItemType)}}`
	} else {
		return wrap(item.Type, item.PrimitiveType)
	}
}

export class DocumentationService {
	sourcePromise: Promise<Specification>
	private sourceUrl: string
	private cache: Cache.Cache<string, string> = new Cache({
		max: 500
	})

	constructor(sourceUrl: string) {
		this.sourceUrl = sourceUrl
		this.sourcePromise = this._getSource()
	}

	async getPropertyDocumentation(
		resourceType: string,
		propertyName: string
	): Promise<string | void> {
		const resource = await this.getResource(resourceType)

		if (resource && resource.Properties[propertyName]) {
			const resourceProperty = resource.Properties[propertyName]
			const propertyKey =
				resourceProperty.ItemType || resourceProperty.Type
			const property = await this.getProperty(
				`${resourceType}.${getPropertyNameFromKey(propertyKey)}`
			)

			if (property) {
				return [
					`[${resourceType}](${resource.Documentation}) / Properties / [${propertyName}](${property.Documentation})`,
					"\n",
					"| Property | Type |",
					"| ------ | ------ |",
					map(
						property.Properties,
						(nestedProperty, nestedPropertyName) => {
							return `| [\`${nestedPropertyName}\`](${
								nestedProperty.Documentation
							}) | ${getItemType(nestedProperty)} |`
						}
					).join("\n")
				].join("\n")
			} else {
				return `${propertyName}: ${getItemType(resourceProperty)}`
			}
		}
	}

	async getResourceDocumentation(
		resourceType: string
	): Promise<string | void> {
		if (this.cache.has(resourceType)) {
			return this.cache.get(resourceType)
		}

		try {
			const resource = await this.getResource(resourceType)

			if (resource) {
				const propertiesKeys = Object.keys(resource.Properties)
				const propertiesCount = propertiesKeys.length
				const visiblePropertiesKeys = propertiesKeys.slice(
					0,
					MAX_PROPERTIES
				)
				const properties = (await Promise.all(
					map(visiblePropertiesKeys, async name => {
						const value = resource.Properties[name]

						return `| [${name}](${
							value.Documentation
						}) | ${await this.getPropertyTypeDocumentation(
							resourceType,
							name,
							value
						)} |`
					})
				)).join(`\n`)

				const attributes = map(resource.Attributes, (value, name) => {
					return `| ${name} | ${getItemType(value)} |`
				}).join("\n")

				const markdown = [
					`[${resourceType}](${resource.Documentation})`,
					"\n",
					"| Property | Type |",
					"| ------ | ------ |",
					properties,
					`\n${
						propertiesCount > MAX_PROPERTIES
							? `- [${propertiesCount -
									MAX_PROPERTIES} more...](${
									resource.Documentation
							  })`
							: ""
					}`,
					"\n",
					"| Attribute | Type |",
					"| ------ | ------ |",
					attributes
				].join("\n")

				this.cache.set(resourceType, markdown)

				return markdown
			}
		} catch (err) {
			return
		}
		return
	}

	private async _getSource(): Promise<Specification> {
		const docStr = await requestService(this.sourceUrl)

		try {
			const doc = JSON.parse(docStr) as Specification
			Object.assign(doc.PropertyTypes, SamSpecification.PropertyTypes)
			Object.assign(doc.ResourceTypes, SamSpecification.ResourceTypes)

			return doc
		} catch (err) {
			return {
				PropertyTypes: {},
				ResourceTypes: {}
			}
		}
	}

	private async getResource(
		resourceType: string
	): Promise<ResourceSpecification | void> {
		const specifications = await this.sourcePromise

		return specifications.ResourceTypes[resourceType]
	}

	private async getProperty(
		propertyName: string
	): Promise<PropertySpecification | void> {
		const specifications = await this.sourcePromise

		return specifications.PropertyTypes[propertyName]
	}

	private async getPropertyTypeDocumentation(
		resourceType: string,
		propertyName: string,
		property: Property
	): Promise<string> {
		try {
			const typeKey = property.ItemType || property.Type
			const propertySpecification = await this.getProperty(
				isPropertyKey(typeKey)
					? typeKey
					: `${resourceType}.${propertyName}`
			)

			return getItemType(
				property,
				propertySpecification && propertySpecification.Documentation
			)
		} catch (err) {
			// tslint:disable-next-line: no-console
			console.error(err)
		}
	}
}

const documentationSourceUrl =
	"https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json"

export default new DocumentationService(documentationSourceUrl)
