"use strict"

import fs = require("fs")
import map = require("lodash/map")
import cloneDeep = require("lodash/cloneDeep")
import path = require("path")
import request = require("request-promise")

const downloadSchema = async (): Promise<object> => {
	const response = await request.get(
		"https://raw.githubusercontent.com/awslabs/goformation/master/schema/cloudformation.schema.json",
		{ json: true }
	)

	return response
}

export const enrichResources = (schema: any) => {
	map(schema.definitions, definition => {
		if (
			definition.properties &&
			definition.properties.DeletionPolicy &&
			!definition.properties.UpdateReplacePolicy
		) {
			definition.properties.UpdateReplacePolicy = cloneDeep(
				definition.properties.DeletionPolicy
			)
		}

		if (
			definition.properties &&
			definition.properties.DependsOn &&
			!definition.properties.Condition
		) {
			definition.properties.Condition = {
				anyOf: [
					{
						pattern: "^[a-zA-Z0-9]+$",
						type: "string"
					},
					{
						items: {
							pattern: "^[a-zA-Z0-9]+$",
							type: "string"
						},
						type: "array"
					}
				]
			}
		}
	})
}

const generateSchema = (schema: any): any => {
	enrichResources(schema)

	return schema
}

const main = async () => {
	const schema = await downloadSchema()

	fs.writeFileSync(
		path.join(process.cwd(), "schema.json"),
		JSON.stringify(generateSchema(schema), null, 4),
		"utf-8"
	)
}

main()
