import { JSONSchema } from "@serverless-ide/config"

import { RUNTIMES } from "./constants"

export const getInsertTextForPlainText = (text: string): string => {
	return text.replace(/[\\\$\}]/g, "\\$&") // escape $, \ and }
}

export const getInsertTextForValue = (
	value: any,
	separatorAfter: string
): string => {
	const text = value
	if (text === "{}") {
		return "{\n\t$1\n}" + separatorAfter
	} else if (text === "[]") {
		return "[\n\t$1\n]" + separatorAfter
	}
	return getInsertTextForPlainText(text + separatorAfter)
}

export const getInsertTextForString = (
	schema: JSONSchema,
	insertIndex: number = 1
): string => {
	if (schema.enum) {
		if (schema.enum.length === 1) {
			return schema.enum[0]
		}
		return `\${${insertIndex}|${schema.enum.join(",")}|}`
	}

	return schema.default || `\$${insertIndex}`
}

export const getPropertyType = (propertySchema: JSONSchema): string => {
	let type = Array.isArray(propertySchema.type)
		? propertySchema.type[0]
		: propertySchema.type

	if (!type) {
		if (propertySchema.properties) {
			type = "object"
		}
		if (propertySchema.items) {
			type = "array"
		}
		if (propertySchema.anyOf && propertySchema.anyOf.length > 0) {
			type = "anyOf"
		}
		if (propertySchema.oneOf && propertySchema.oneOf.length > 0) {
			type = "oneOf"
		}
		if (propertySchema.allOf && propertySchema.allOf.length > 0) {
			type = "allOf"
		}
	}

	return type
}

export const getInsertTextForObject = (
	schema: JSONSchema,
	separatorAfter: string,
	indent = "\t",
	insertIndex = 1
) => {
	let insertText = ""
	let isEmpty = true
	if (!schema.properties) {
		insertText = `${indent}\$${insertIndex++}\n`
		return { insertText, insertIndex, isEmpty }
	}

	const requiredProperties = schema.required || []

	requiredProperties.forEach(key => {
		const propertySchema = schema.properties[key]
		const type = getPropertyType(propertySchema)
		const defaultPropertyValue = getInsertTextForDefaultProperty(
			key,
			propertySchema,
			insertIndex++
		)

		if (defaultPropertyValue) {
			insertText += `${indent}${key}:${defaultPropertyValue}`
			return
		}

		switch (type) {
			case "boolean":
			case "number":
			case "integer":
				insertText += `${indent}${key}: \$${insertIndex++}\n`
				break
			case "string":
				insertText += `${indent}${key}: ${getInsertTextForString(
					schema.properties[key],
					insertIndex++
				)}\n`
				break
			case "array":
				const arrayInsertResult = getInsertTextForArray(
					propertySchema.items,
					separatorAfter,
					`  ${indent}`,
					insertIndex++
				)
				insertIndex = arrayInsertResult.insertIndex
				insertText += `${indent}${key}:\n${indent}\t- ${arrayInsertResult.insertText}\n`
				break
			case "object": {
				const insertResult = getInsertTextForObject(
					propertySchema,
					separatorAfter,
					`${indent}${indent}`,
					insertIndex++
				)
				insertIndex = insertResult.insertIndex
				insertText += `${indent}${key}:\n${insertResult.insertText}\n`
				break
			}
			case "anyOf":
			case "oneOf": {
				insertText += `${indent}${getInsertTextForProperty(
					key,
					propertySchema[type][0],
					separatorAfter,
					insertIndex++
				)}\n`
				break
			}
			case "allOf": {
				const options = propertySchema[type]
				insertIndex += 1
				const insertResults = []

				for (const option of options) {
					const insertResult = getInsertTextForObject(
						option,
						separatorAfter,
						`${indent}${indent}`,
						insertIndex
					)

					if (!insertResult.isEmpty) {
						insertResults.push(insertResult)
					}
				}

				if (insertResults.length) {
					insertText += `${indent}${key}:\n${insertResults
						.map(result => result.insertText)
						.join("\n")}\n`
				}

				break
			}
		}
	})

	Object.keys(schema.properties).forEach((key: string) => {
		const propertySchema = schema.properties[key]
		const type = getPropertyType(propertySchema)
		if (
			requiredProperties.indexOf(key) === -1 &&
			propertySchema.default !== undefined
		) {
			switch (type) {
				case "boolean":
				case "number":
				case "integer":
				case "string":
					insertText += `${indent}${key}: \${${insertIndex++}:${
						propertySchema.default
					}}\n`
					break
				case "array":
				case "object":
					// TODO: support default value for array object
					break
			}
		}
	})

	if (insertText.trim().length === 0) {
		insertText = `${indent}\$${insertIndex++}\n`
	} else {
		isEmpty = false
	}
	insertText = insertText.trimRight() + separatorAfter
	return { insertText, insertIndex, isEmpty }
}

export const getInsertTextForArray = (
	schema: JSONSchema,
	separatorAfter: string,
	indent = "\t",
	insertIndex = 1
) => {
	let insertText = ""
	if (!schema) {
		insertText = `\$${insertIndex++}`
	}
	let type = Array.isArray(schema.type) ? schema.type[0] : schema.type
	if (!type) {
		if (schema.properties) {
			type = "object"
		}
		if (schema.items) {
			type = "array"
		}
	}
	switch (schema.type) {
		case "boolean":
			insertText = `\${${insertIndex++}:false}`
			break
		case "number":
		case "integer":
			insertText = `\${${insertIndex++}:0}`
			break
		case "string":
			insertText = `\${${insertIndex++}:null}`
			break
		case "object":
			const objectInsertResult = getInsertTextForObject(
				schema,
				separatorAfter,
				`${indent}\t`,
				insertIndex++
			)
			insertText = objectInsertResult.insertText.trimLeft()
			insertIndex = objectInsertResult.insertIndex
			break
	}
	return { insertText, insertIndex }
}

export const getInsertTextForDefaultProperty = (
	key: string,
	propertySchema: JSONSchema,
	insertIndex: number = 1
): string => {
	if (!propertySchema) {
		return ""
	}

	switch (key) {
		case "Runtime":
		case "runtime":
			if (propertySchema.type === "string") {
				return ` \${${insertIndex}|${RUNTIMES.join(",")}|}`
			}
		default:
			return ""
	}
}

export const getInsertTextForProperty = (
	key: string,
	propertySchema: JSONSchema,
	separatorAfter: string,
	insertIndex: number = 1,
	isInArray: boolean = false
): string => {
	const propertyText = getInsertTextForValue(key, "")
	const resultText = propertyText + ":"

	let value: string = getInsertTextForDefaultProperty(
		key,
		propertySchema,
		insertIndex
	)
	if (!value && propertySchema) {
		if (propertySchema.default !== undefined) {
			value = ` \${${insertIndex}:${propertySchema.default}}`
		} else if (propertySchema.properties) {
			return `${resultText}\n${
				getInsertTextForObject(
					propertySchema,
					separatorAfter,
					isInArray ? "  \t" : "\t"
				).insertText
			}`
		} else if (propertySchema.items) {
			return `${resultText}\n\t- ${
				getInsertTextForArray(
					propertySchema.items,
					separatorAfter,
					isInArray ? "    " : "  "
				).insertText
			}`
		} else {
			const type = Array.isArray(propertySchema.type)
				? propertySchema.type[0]
				: propertySchema.type
			switch (type) {
				case "boolean":
					value = ` $${insertIndex}`
					break
				case "string":
					value = ` ${getInsertTextForString(
						propertySchema,
						insertIndex
					)}`
					break
				case "object":
					value = "\n\t"
					break
				case "array":
					value = "\n\t- "
					break
				case "number":
				case "integer":
					value = ` $\{${insertIndex}:0\}`
					break
				case "null":
					value = ` $\{${insertIndex}:null\}`
					break
				default:
					return propertyText
			}
		}
	}
	if (!value) {
		value = `$${insertIndex}`
	}
	return resultText + value + separatorAfter
}
