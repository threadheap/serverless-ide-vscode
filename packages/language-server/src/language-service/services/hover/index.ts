import * as Parser from "@serverless-ide/config"
import {
	Hover,
	MarkedString,
	Position,
	Range,
	TextDocument
} from "vscode-languageserver-types"

import documentationService, { DocumentationService } from "../documentation"
import * as SchemaService from "../jsonSchema"
import { LanguageSettings } from "./../../model/settings"

const createHover = (contents: MarkedString[], hoverRange: Range): Hover => {
	const result: Hover = {
		contents,
		range: hoverRange
	}
	return result
}

export class YAMLHover {
	private schemaService: SchemaService.JSONSchemaService
	private shouldHover: boolean
	private documentationService: DocumentationService = documentationService

	constructor(schemaService: SchemaService.JSONSchemaService) {
		this.schemaService = schemaService
		this.shouldHover = true
	}

	configure(languageSettings: LanguageSettings) {
		if (languageSettings) {
			this.shouldHover = languageSettings.hover
		}
	}

	async doHover(
		document: TextDocument,
		position: Position,
		doc: Parser.YAMLDocument
	): Promise<Hover> {
		const contents = []
		if (!this.shouldHover || !document) {
			return Promise.resolve(void 0)
		}

		const offset = document.offsetAt(position)
		const schema = await this.schemaService.getSchemaForDocument(
			document,
			doc
		)

		if (!schema) {
			return
		}
		const node = doc.getNodeFromOffset(offset)

		if (
			!node ||
			((node.type === "object" || node.type === "array") &&
				offset > node.start + 1 &&
				offset < node.end - 1)
		) {
			return Promise.resolve(void 0)
		}
		const hoverRangeNode = node
		const hoverRange = Range.create(
			document.positionAt(hoverRangeNode.start),
			document.positionAt(hoverRangeNode.end)
		)
		const path = node.getPath()

		if (path.length > 1) {
			const description = schema.getLastDescription(
				node.getPath().map(String)
			)

			if (description) {
				contents.push(description)
			}
		}

		if (node.getPath().length >= 2) {
			const resourceType = Parser.getResourceName(node)
			const propertyName = this.getPropertyName(node)

			if (resourceType) {
				let markdown: string | void

				if (propertyName) {
					markdown = await this.documentationService.getPropertyDocumentation(
						resourceType,
						String(propertyName)
					)
				} else {
					markdown = await this.documentationService.getResourceDocumentation(
						resourceType
					)
				}

				if (markdown) {
					contents.push(markdown)
				}
			}
		}

		if (contents.length > 0) {
			return createHover(contents, hoverRange)
		}

		return void 0
	}

	private getPropertyName(node: Parser.ASTNode): string | void {
		const path = Parser.getRelativeNodePath(node)

		if (
			path.length >= 4 &&
			path[0] === "Resources" &&
			path[2] === "Properties"
		) {
			return path[3] as string
		}
	}
}
