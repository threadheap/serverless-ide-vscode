import glob = require("glob")
import * as path from "path"
import { readFileSync, writeFileSync } from "fs"
import samSchema = require("@serverless-ide/sam-schema/schema.json")

const readDefinitions = () => {
	const files = glob.sync("./json/**/*.json")

	const hash: { [key: string]: string } = {}

	files.forEach(file => {
		hash[
			file
				.replace("./json/", "")
				.replace(".json", "")
				.replace(/\//g, ":")
		] = JSON.parse(
			readFileSync(file, {
				encoding: "utf8"
			})
		)
	})

	return hash
}

const buildSchema = async () => {
	const definitions = readDefinitions()

	return {
		$id: "http://json-schema.org/draft-04/schema#",
		additionalProperties: true,
		definitions: {
			...definitions,
			...samSchema.definitions
		},
		properties: {
			app: {
				type: "string"
			},
			org: {
				type: "string"
			},
			service: {
				$ref: "#/definitions/aws:service"
			},
			frameworkVersion: {
				type: "string"
			},
			provider: {
				$ref: "#/definitions/aws:provider:provider"
			},
			package: {
				$ref: "#/definitions/common:package-config"
			},
			functions: {
				$ref: "#/definitions/aws:functions:functions"
			},
			layers: {
				$ref: "#/definitions/aws:layers"
			},
			resources: {
				oneOf: [
					{
						type: "object",
						properties: samSchema.properties,
						additionalProperties: false
					},
					{
						type: "array",
						item: {
							type: "object",
							properties: samSchema.properties,
							additionalProperties: false
						}
					}
				]
			},
			custom: {
				type: "object"
			},
			plugins: {
				type: "array"
			}
		},
		required: ["service", "provider"]
	}
}

const generate = async () => {
	writeFileSync(
		path.resolve("./schema.json"),
		JSON.stringify(await buildSchema(), null, 2),
		{ encoding: "utf8" }
	)
}

generate()
