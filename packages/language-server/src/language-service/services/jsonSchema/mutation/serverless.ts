import cloneDeep = require("lodash/cloneDeep")
import without = require("lodash/without")
import { DocumentType } from "../../../model/document"
import { YAMLDocument } from "./../../../parser/json/document"
import { ResolvedSchema } from ".."
import { sendException } from "../../analytics"

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
				const functionProperties =
					clonedSchema.properties.functions.patternProperties[
						"^[a-zA-Z0-9]+$"
					]
				functionProperties.required = without(
					functionProperties.required,
					"runtime"
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
