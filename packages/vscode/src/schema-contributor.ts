import Uri from "vscode-uri"

interface SchemaContributorProvider {
	readonly requestSchema: (resource: string) => string
	readonly requestSchemaContent: (uri: string) => string
}

class SchemaContributor {
	private customSchemaContributors: {
		[index: string]: SchemaContributorProvider
	} = {}

	/**
	 * Register a custom schema provider
	 *
	 * @param {string} the provider's name
	 * @param requestSchema the requestSchema function
	 * @param requestSchemaContent the requestSchemaContent function
	 * @returns {boolean}
	 */
	public registerContributor(
		schema: string,
		requestSchema: (resource: string) => string,
		requestSchemaContent: (uri: string) => string
	) {
		if (this.customSchemaContributors[schema]) {
			return false
		}
		if (!requestSchema) {
			throw new Error("Illegal parameter for requestSchema.")
		}

		this.customSchemaContributors[schema] = {
			requestSchema,
			requestSchemaContent
		} as SchemaContributorProvider
		return true
	}

	/**
	 * Call requestSchema for each provider and find the first one who reports he can provide the schema.
	 *
	 * @param {string} resource
	 * @returns {string} the schema uri
	 */
	public requestCustomSchema(resource: string) {
		for (const customKey of Object.keys(this.customSchemaContributors)) {
			const contributor = this.customSchemaContributors[customKey]
			const uri = contributor.requestSchema(resource)
			if (uri) {
				return uri
			}
		}
	}

	/**
	 * Call requestCustomSchemaContent for named provider and get the schema content.
	 *
	 * @param {string} uri the schema uri returned from requestSchema.
	 * @returns {string} the schema content
	 */
	public requestCustomSchemaContent(uri: string) {
		if (uri) {
			const newUri = Uri.parse(uri)
			if (
				newUri.scheme &&
				this.customSchemaContributors[newUri.scheme] &&
				this.customSchemaContributors[newUri.scheme]
					.requestSchemaContent
			) {
				return this.customSchemaContributors[
					newUri.scheme
				].requestSchemaContent(uri)
			}
		}
	}
}

// global instance
const schemaContributor = new SchemaContributor()

// constants
export const CUSTOM_SCHEMA_REQUEST = "custom/schema/request"
export const CUSTOM_CONTENT_REQUEST = "custom/schema/content"

export { schemaContributor }
