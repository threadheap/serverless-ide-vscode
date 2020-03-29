import { CUSTOM_TAGS } from "../model"
import {
	ErrorCode,
	ExternalImportsCallbacks,
	Problem,
	YAMLDocument
} from "./json"

import noop = require("lodash/noop")

import { Schema, Type } from "js-yaml"
import { TextDocument } from "vscode-languageserver-types"
import * as Yaml from "yaml-ast-parser-custom-tags"

import { DocumentType } from "../model"
import { getDocumentType } from "../utils"
import { ParentParams } from "./json/document"

export { YAMLDocument, Problem, ExternalImportsCallbacks }
export * from "./json"
export { collectReferencesFromStringNode } from "./references"

function convertError(e: Yaml.YAMLException): Problem {
	return {
		message: `${e.reason}`,
		location: {
			start: e.mark.position,
			end: e.mark.position + e.mark.column
		},
		code: ErrorCode.Undefined
	}
}

function createJSONDocument(
	document: TextDocument,
	yamlDoc: Yaml.YAMLNode | void,
	callbacks: ExternalImportsCallbacks,
	parentParams?: ParentParams
) {
	const doc = new YAMLDocument(
		document.uri,
		parentParams
			? DocumentType.UNKNOWN
			: getDocumentType(document.getText()),
		yamlDoc,
		callbacks,
		parentParams
	)

	if (!yamlDoc || !doc.root) {
		// TODO: When this is true, consider not pushing the other errors.
		doc.errors.push({
			message: "Expected a YAML object, array or literal",
			code: ErrorCode.Undefined,
			location: yamlDoc
				? {
						start: yamlDoc.startPosition,
						end: yamlDoc.endPosition
				  }
				: { start: 0, end: 0 }
		})

		return doc
	}

	const duplicateKeyReason = "duplicate key"

	// Patch ontop of yaml-ast-parser to disable duplicate key message on merge key
	const isDuplicateAndNotMergeKey = (
		error: Yaml.YAMLException,
		yamlText: string
	) => {
		const errorConverted = convertError(error)
		const errorStart = errorConverted.location.start
		const errorEnd = errorConverted.location.end
		if (
			error.reason === duplicateKeyReason &&
			yamlText.substring(errorStart, errorEnd).startsWith("<<")
		) {
			return false
		}
		return true
	}
	doc.errors = yamlDoc.errors
		.filter(e => e.reason !== duplicateKeyReason && !e.isWarning)
		.map(e => convertError(e))
	doc.warnings = yamlDoc.errors
		.filter(
			e =>
				(e.reason === duplicateKeyReason &&
					isDuplicateAndNotMergeKey(e, document.getText())) ||
				e.isWarning
		)
		.map(e => convertError(e))

	return doc
}

export const parse = (
	document: TextDocument,
	callbacks: ExternalImportsCallbacks = {
		onRegisterExternalImport: noop,
		onValidateExternalImport: noop
	},
	parentParams?: ParentParams
): YAMLDocument => {
	// We need compiledTypeMap to be available from schemaWithAdditionalTags before we add the new custom propertie
	const compiledTypeMap: { [key: string]: Type } = {}

	CUSTOM_TAGS.forEach(customTag => {
		if (customTag.tag) {
			const [kind, ...additionalKinds] = customTag.kind

			compiledTypeMap[customTag.tag] = new Type(customTag.tag, {
				kind,
				construct: data => {
					if (data) {
						data.customTag = customTag

						return data
					}

					return null
				}
			})
			// @ts-ignore
			compiledTypeMap[customTag.tag].additionalKinds = additionalKinds
		}
	})

	const schemaWithAdditionalTags = Schema.create(
		Object.values(compiledTypeMap)
	)
	;(schemaWithAdditionalTags as any).compiledTypeMap = compiledTypeMap

	const additionalOptions: Yaml.LoadOptions = {
		schema: schemaWithAdditionalTags
	}
	const text = document.getText()

	return createJSONDocument(
		document,
		Yaml.load(text, additionalOptions),
		callbacks,
		parentParams
	)
}
