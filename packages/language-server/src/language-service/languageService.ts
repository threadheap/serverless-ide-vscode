import { IConnection } from "vscode-languageserver"
import {
	CompletionList,
	Diagnostic,
	Position,
	TextDocument
} from "vscode-languageserver-types"
import { LanguageSettings } from "./model/settings"
import { YAMLDocument } from "./parser"
import { YAMLCompletion } from "./services/completion"
import { findDocumentSymbols } from "./services/documentSymbols"
import { YAMLHover } from "./services/hover"
import { JSONSchemaService } from "./services/jsonSchema"
import { YAMLValidation } from "./services/validation"

export interface WorkspaceContextService {
	resolveRelativePath(relativePath: string, resource: string): string
}
/**
 * The schema request service is used to fetch schemas. The result should the schema file comment, or,
 * in case of an error, a displayable error string
 */
export type SchemaRequestService = (uri: string) => Promise<string>

export interface CustomFormatterOptions {
	singleQuote?: boolean
	bracketSpacing?: boolean
	proseWrap?: string
}

export interface LanguageService {
	configure(settings: LanguageSettings): void
	doComplete(
		document: TextDocument,
		position: Position,
		doc: YAMLDocument
	): Promise<CompletionList>
	doValidation(document: TextDocument, yamlDocument): Promise<Diagnostic[]>
	doHover(document: TextDocument, position: Position, doc: YAMLDocument)
	findDocumentSymbols(document: TextDocument, doc: YAMLDocument)
	doResolve(completionItem)
}

export function getLanguageService(
	settings: LanguageSettings,
	connection: IConnection
): LanguageService {
	const schemaService = new JSONSchemaService()

	const completer = new YAMLCompletion(schemaService)
	const hover = new YAMLHover(schemaService)
	const yamlValidation = new YAMLValidation(
		schemaService,
		settings.workspaceRoot,
		connection
	)

	const configure = (newSettings: LanguageSettings) => {
		yamlValidation.configure(newSettings)
		hover.configure(newSettings)
		completer.configure(newSettings)
	}

	return {
		configure,
		doComplete: completer.doComplete.bind(completer),
		doResolve: completer.doResolve.bind(completer),
		doValidation: yamlValidation.doValidation.bind(yamlValidation),
		doHover: hover.doHover.bind(hover),
		findDocumentSymbols
	}
}
