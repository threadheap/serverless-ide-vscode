import cloneDeep = require("lodash/cloneDeep")
import toArray = require("lodash/toArray")
import without = require("lodash/without")
import { GlobalsConfig, isEmpty } from "../../model/globals"
import { ResolvedSchema } from "./"
import { SingleYAMLDocument } from "./../../parser/index"
import { sendException } from "../analytics"

const applyGlobalsConfigMutations = (
	schema: ResolvedSchema,
	globalsConfig: GlobalsConfig
): ResolvedSchema => {
	const jsonSchema = schema.schema
	const globalsItems = toArray(globalsConfig)

	if (
		jsonSchema.definitions &&
		globalsItems.some(item => {
			return Boolean(
				jsonSchema.definitions[item.resourceType] &&
					item.properties.length > 0
			)
		})
	) {
		const clonedSchema = cloneDeep(jsonSchema)

		try {
			globalsItems.forEach(item => {
				const resourceDefinition =
					clonedSchema.definitions[item.resourceType]

				if (!resourceDefinition) {
					return
				}

				const originalRequired =
					resourceDefinition.properties.Properties.required

				resourceDefinition.properties.Properties.required = without(
					originalRequired,
					...(item.properties as string[])
				)
			})
		} catch (err) {
			sendException(err)
			return schema
		}

		return new ResolvedSchema(clonedSchema, schema.errors)
	}

	return schema
}

export const applyDocumentMutations = (
	schema: ResolvedSchema | void,
	yamlDocument: SingleYAMLDocument
): ResolvedSchema | void => {
	// early exit, if schema is not defined
	if (!schema) {
		return schema
	}

	const { globalsConfig } = yamlDocument

	if (isEmpty(globalsConfig)) {
		return schema
	}

	return applyGlobalsConfigMutations(schema, globalsConfig)
}
