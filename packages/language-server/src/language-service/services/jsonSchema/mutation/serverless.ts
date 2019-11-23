import cloneDeep = require("lodash/cloneDeep")
import without = require("lodash/without")
import { DocumentType, JSONSchema, YAMLDocument } from "@serverless-ide/config"

import { ResolvedSchema } from ".."
import { sendException } from "../../analytics"

const updateFunctionProperties = (
	functionProperties: JSONSchema
): JSONSchema => {
	functionProperties.required = without(
		functionProperties.required,
		"runtime"
	)

	return functionProperties
}

export const applyProviderMutations = (
	schema: ResolvedSchema,
	yamlDocument: YAMLDocument
): ResolvedSchema => {
	const jsonSchema = schema.schema

	if (
		yamlDocument.documentType === DocumentType.SERVERLESS_FRAMEWORK &&
		yamlDocument.root
	) {
		const clonedSchema = cloneDeep(jsonSchema)
		const runtimeNode = yamlDocument.root.get(["provider", "runtime"])

		if (runtimeNode) {
			try {
				updateFunctionProperties(
					clonedSchema.properties.functions.oneOf[0]
						.patternProperties["^[a-zA-Z0-9]+$"]
				)
				updateFunctionProperties(
					clonedSchema.properties.functions.oneOf[1].items
						.patternProperties["^[a-zA-Z0-9]+$"]
				)
			} catch (err) {
				sendException(err)
				return schema
			}
		}

		return new ResolvedSchema(clonedSchema, schema.errors)
	}

	return schema
}
