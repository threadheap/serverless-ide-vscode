import {
	CompletionList,
	Diagnostic,
	Position,
	TextDocument
} from "vscode-languageserver-types"
import { JSONSchema } from "./jsonSchema"
import { YAMLDocument } from "./parser"
import { YAMLCompletion } from "./services/completion"
import { YAMLDocumentSymbols } from "./services/documentSymbols"
import { YAMLHover } from "./services/hover"
import { JSONSchemaService } from "./services/jsonSchema/lagacy_index"
import { YAMLValidation } from "./services/validation"

export interface LanguageSettings {
	validate?: boolean // Setting for whether we want to validate the schema
	hover?: boolean // Setting for whether we want to have hover results
	completion?: boolean // Setting for whether we want to have completion results
	schemas?: SchemaConfiguration[] // List of schemas,
	customTags?: string[] // Array of Custom Tags
}

export interface WorkspaceContextService {
	resolveRelativePath(relativePath: string, resource: string): string
}
/**
 * The schema request service is used to fetch schemas. The result should the schema file comment, or,
 * in case of an error, a displayable error string
 */
export type SchemaRequestService = (uri: string) => Promise<string>

export interface SchemaConfiguration {
	/**
	 * The URI of the schema, which is also the identifier of the schema.
	 */
	uri: string
	/**
	 * The schema for the given URI.
	 * If no schema is provided, the schema will be fetched with the schema request service (if available).
	 */
	schema?: JSONSchema
	/**
	 * Document matcher function
	 * Detects supported documents by it's file name and content
	 */
	documentMatch: (textDocument: TextDocument) => boolean
}

export interface CustomFormatterOptions {
	singleQuote?: boolean
	bracketSpacing?: boolean
	proseWrap?: string
}

export interface LanguageService {
	configure(settings): void
	doComplete(
		document: TextDocument,
		position: Position,
		doc: YAMLDocument
	): Promise<CompletionList>
	doValidation(document: TextDocument, yamlDocument): Promise<Diagnostic[]>
	doHover(document: TextDocument, position: Position, doc: YAMLDocument)
	findDocumentSymbols(document: TextDocument, doc: YAMLDocument)
	doResolve(completionItem)
	resetSchema(uri: string): boolean
}

export function getLanguageService(
	workspaceContext,
	contributions
): LanguageService {
	const schemaService = new JSONSchemaService(workspaceContext)

	const completer = new YAMLCompletion(schemaService, contributions)
	const hover = new YAMLHover(schemaService)
	const yamlDocumentSymbols = new YAMLDocumentSymbols()
	const yamlValidation = new YAMLValidation(schemaService)

	return {
		configure: (settings: LanguageSettings) => {
			schemaService.clearExternalSchemas()
			if (settings.schemas) {
				settings.schemas.forEach(schemaSettings => {
					schemaService.registerExternalSchema(
						schemaSettings.uri,
						schemaSettings.documentMatch,
						schemaSettings.schema
					)
				})
			}
			yamlValidation.configure(settings)
			hover.configure(settings)
			const customTagsSetting =
				settings && settings.customTags ? settings.customTags : []
			completer.configure(settings, customTagsSetting)
		},
		doComplete: completer.doComplete.bind(completer),
		doResolve: completer.doResolve.bind(completer),
		doValidation: yamlValidation.doValidation.bind(yamlValidation),
		doHover: hover.doHover.bind(hover),
		findDocumentSymbols: yamlDocumentSymbols.findDocumentSymbols.bind(
			yamlDocumentSymbols
		),
		resetSchema: (uri: string) => schemaService.onResourceChange(uri)
	}
}
