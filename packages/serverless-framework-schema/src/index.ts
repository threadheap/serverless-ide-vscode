import glob = require("glob")
import * as https from "https"
import * as path from "path"
import { readFileSync, writeFileSync } from "fs"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadCloudFormationSchema = (): Promise<any> => {
	return new Promise((resolve, reject) => {
		https
			.get(
				"https://raw.githubusercontent.com/awslabs/goformation/master/schema/cloudformation.schema.json",
				resp => {
					let data = ""

					// A chunk of data has been recieved.
					resp.on("data", chunk => {
						data += chunk
					})

					// The whole response has been received. Print out the result.
					resp.on("end", () => {
						resolve(JSON.parse(data))
					})
				}
			)
			.on("error", reject)
	})
}

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
	const cloudFormationSchema = await loadCloudFormationSchema()

	return {
		$id: "http://json-schema.org/draft-04/schema#",
		additionalProperties: false,
		definitions: {
			...definitions,
			...cloudFormationSchema.definitions
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
				type: "object",
				properties: {
					Resources: cloudFormationSchema.properties.Resources,
					Parameters: cloudFormationSchema.properties.Parameters,
					Metadata: cloudFormationSchema.properties.Metadata,
					Outputs: cloudFormationSchema.properties.Outputs
				},
				additionalProperties: false
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
