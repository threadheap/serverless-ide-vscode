"use strict"

import URI from "vscode-uri"
import { JSONSchema } from "../../jsonSchema"
import { WorkspaceContextService } from "../../languageService"
import { SingleYAMLDocument } from "../../parser"
import requestService from "../request"

import forEach = require("lodash/forEach")

/**
 * getParseErrorMessage has been removed from jsonc-parser since 1.0.0
 *
 * see https://github.com/Microsoft/node-jsonc-parser/blob/42ec16f9c91582d4267a0c48199cdac283c90fc9/CHANGELOG.md
 * 1.0.0
 *  remove nls dependency (remove getParseErrorMessage)
 */

export interface IJSONSchemaService {
	/**
	 * Registers a schema file in the current workspace to be applicable to files that match the pattern
	 */
	registerExternalSchema(
		uri: string,
		filePatterns?: string[],
		unresolvedSchema?: JSONSchema
	): ISchemaHandle

	/**
	 * Clears all cached schema files
	 */
	clearExternalSchemas(): void

	/**
	 * Registers contributed schemas
	 */
	setSchemaContributions(schemaContributions: ISchemaContributions): void

	/**
	 * Looks up the appropriate schema for the given URI
	 */
	getSchemaForResource(resource: string): Promise<ResolvedSchema | null>

	/**
	 *
	 * Looks up the appropriate schema for a single yaml document
	 * and applies real time mutations
	 */
	getSchemaForDocument(
		documentUri: string,
		yamlDocument: SingleYAMLDocument,
		documentIndex: number
	): Promise<ResolvedSchema | void>

	/**
	 * Returns all registered schema ids
	 */
	getRegisteredSchemaIds(filter?: (scheme) => boolean): string[]
}

export interface ISchemaAssociations {
	[pattern: string]: string[]
}

export interface ISchemaContributions {
	schemas?: { [id: string]: JSONSchema }
	schemaAssociations?: ISchemaAssociations
}

export declare type CustomSchemaProvider = (uri: string) => Promise<string>

export interface ISchemaHandle {
	/**
	 * The schema id
	 */
	url: string

	/**
	 * The schema from the file, with potential $ref references
	 */
	getUnresolvedSchema(): Promise<UnresolvedSchema>

	/**
	 * The schema from the file, with references resolved
	 */
	getResolvedSchema(): Promise<ResolvedSchema>
}

// tslint:disable-next-line: max-classes-per-file
class SchemaHandle implements ISchemaHandle {
	public url: string

	private resolvedSchema: Promise<ResolvedSchema>
	private unresolvedSchema: Promise<UnresolvedSchema>
	private service: JSONSchemaService

	constructor(
		service: JSONSchemaService,
		url: string,
		unresolvedSchemaContent?: JSONSchema
	) {
		this.service = service
		this.url = url
		if (unresolvedSchemaContent) {
			this.unresolvedSchema = Promise.resolve(
				new UnresolvedSchema(unresolvedSchemaContent)
			)
		}
	}

	public getUnresolvedSchema(): Promise<UnresolvedSchema> {
		if (!this.unresolvedSchema) {
			this.unresolvedSchema = this.service.loadSchema(this.url)
		}
		return this.unresolvedSchema
	}

	public getResolvedSchema(): Promise<ResolvedSchema> {
		if (!this.resolvedSchema) {
			this.resolvedSchema = this.getUnresolvedSchema().then(
				unresolved => {
					return this.service.resolveSchemaContent(
						unresolved,
						this.url
					)
				}
			)
		}
		return this.resolvedSchema
	}

	public clearSchema(): void {
		this.resolvedSchema = null
		this.unresolvedSchema = null
	}
}

// tslint:disable-next-line: max-classes-per-file
export class JSONSchemaService implements IJSONSchemaService {
	private contributionSchemas: { [id: string]: SchemaHandle }
	private contributionAssociations: { [id: string]: string[] }

	private schemasById: { [id: string]: SchemaHandle }
	private registeredSchemasIds: { [id: string]: boolean }

	private contextService: WorkspaceContextService
	private callOnDispose: Array<() => void>

	constructor(contextService?: WorkspaceContextService) {
		this.contextService = contextService
		this.callOnDispose = []
		this.contributionSchemas = {}
		this.contributionAssociations = {}
		this.schemasById = {}
		this.registeredSchemasIds = {}
	}

	public getRegisteredSchemaIds(filter?: (scheme) => boolean): string[] {
		return Object.keys(this.registeredSchemasIds).filter(id => {
			const scheme = URI.parse(id).scheme
			return scheme !== "schemaservice" && (!filter || filter(scheme))
		})
	}

	public dispose(): void {
		while (this.callOnDispose.length > 0) {
			this.callOnDispose.pop()()
		}
	}

	public onResourceChange(uri: string): boolean {
		uri = this.normalizeId(uri)
		const schemaFile = this.schemasById[uri]
		if (schemaFile) {
			schemaFile.clearSchema()
			return true
		}
		return false
	}

	public setSchemaContributions(
		schemaContributions: ISchemaContributions
	): void {
		if (schemaContributions.schemas) {
			const schemas = schemaContributions.schemas

			forEach(schemas, (schema, id) => {
				const normalizedId = this.normalizeId(id)
				this.contributionSchemas[normalizedId] = this.addSchemaHandle(
					normalizedId,
					schema
				)
			})
		}
		if (schemaContributions.schemaAssociations) {
			const schemaAssociations = schemaContributions.schemaAssociations

			forEach(schemaAssociations, (associations, pattern) => {
				this.contributionAssociations[pattern] = associations

				const fpa = this.getOrAddFilePatternAssociation(pattern)
				associations.forEach(schemaId => {
					const id = this.normalizeId(schemaId)
					fpa.addSchema(id)
				})
			})
		}
	}

	public registerExternalSchema(
		uri: string,
		documentMatch: (text: string) => boolean,
		unresolvedSchemaContent?: JSONSchema
	): ISchemaHandle {
		const id = this.normalizeId(uri)
		this.registeredSchemasIds[id] = true

		this.addDocumentMatchers(id, documentMatch)

		return unresolvedSchemaContent
			? this.addSchemaHandle(id, unresolvedSchemaContent)
			: this.getOrAddSchemaHandle(id)
	}

	public clearExternalSchemas(): void {
		this.schemasById = {}
		this.filePatternAssociations = []
		this.filePatternAssociationById = {}
		this.registeredSchemasIds = {}

		forEach(this.contributionSchemas, (schema, id) => {
			this.schemasById[id] = this.contributionSchemas[id]
			this.registeredSchemasIds[id] = true
		})

		forEach(this.contributionAssociations, (associations, pattern) => {
			const fpa = this.getOrAddFilePatternAssociation(pattern)

			this.contributionAssociations[pattern].forEach(schemaId => {
				const id = this.normalizeId(schemaId)
				fpa.addSchema(id)
			})
		})
	}

	public getResolvedSchema(schemaId: string): Promise<ResolvedSchema> {
		const id = this.normalizeId(schemaId)
		const schemaHandle = this.schemasById[id]
		if (schemaHandle) {
			return schemaHandle.getResolvedSchema()
		}
		return Promise.resolve(null)
	}

	public async loadSchema(url: string): Promise<UnresolvedSchema> {
		try {
			const content = await requestService(url)
			if (!content) {
				const errorMessage = localize(
					"json.schema.nocontent",
					"Unable to load schema from '{0}': No content.",
					toDisplayString(url)
				)
				return new UnresolvedSchema({} as JSONSchema, [errorMessage])
			}
			let schemaContent: JSONSchema = {}
			const jsonErrors = []
			schemaContent = Json.parse(content, jsonErrors)
			const errors = jsonErrors.length
				? [
						localize(
							"json.schema.invalidFormat",
							"Unable to parse content from '{0}': {1}.",
							toDisplayString(url),
							getParseErrorMessage(jsonErrors[0])
						)
				  ]
				: []
			return new UnresolvedSchema(schemaContent, errors)
		} catch (error) {
			const errorMessage = localize(
				"json.schema.unabletoload",
				"Unable to load schema from '{0}': {1}",
				toDisplayString(url),
				error.toString()
			)
			return new UnresolvedSchema({} as JSONSchema, [errorMessage])
		}
	}

	public async getSchemaForResource(
		resource: string
	): Promise<ResolvedSchema> {
		// check for matching file names, last to first
		for (let i = this.filePatternAssociations.length - 1; i >= 0; i--) {
			const entry = this.filePatternAssociations[i]
			if (entry.matchesPattern(resource)) {
				return await entry.getCombinedSchema(this).getResolvedSchema()
			}
		}
		return null
	}

	public async getSchemaForDocument(
		documentUri: string,
		yamlDocument: SingleYAMLDocument,
		documentIndex: number
	): Promise<ResolvedSchema | void> {
		const schema = await this.getSchemaForResource(documentUri)

		/**
		 * Probably redundant code
		 * most likely there won't be more than one schema
		 * per file type
		 */
		if (
			schema &&
			schema.schema &&
			schema.schema.schemaSequence &&
			schema.schema.schemaSequence[documentIndex]
		) {
			return applyDocumentMutations(
				new ResolvedSchema(schema.schema.schemaSequence[documentIndex]),
				yamlDocument
			)
		}

		return applyDocumentMutations(schema, yamlDocument)
	}

	public createCombinedSchema(
		combinedSchemaId: string,
		schemaIds: string[]
	): ISchemaHandle {
		if (schemaIds.length === 1) {
			return this.getOrAddSchemaHandle(schemaIds[0])
		} else {
			const combinedSchema: JSONSchema = {
				allOf: schemaIds.map(schemaId => ({ $ref: schemaId }))
			}
			return this.addSchemaHandle(combinedSchemaId, combinedSchema)
		}
	}

	private normalizeId(id: string) {
		// remove trailing '#', normalize drive capitalization
		return URI.parse(id).toString()
	}

	private addSchemaHandle(
		id: string,
		unresolvedSchemaContent?: JSONSchema
	): SchemaHandle {
		const schemaHandle = new SchemaHandle(this, id, unresolvedSchemaContent)
		this.schemasById[id] = schemaHandle
		return schemaHandle
	}

	private getOrAddSchemaHandle(
		id: string,
		unresolvedSchemaContent?: JSONSchema
	): ISchemaHandle {
		return (
			this.schemasById[id] ||
			this.addSchemaHandle(id, unresolvedSchemaContent)
		)
	}
}

function toDisplayString(url: string) {
	try {
		const uri = URI.parse(url)
		if (uri.scheme === "file") {
			return uri.fsPath
		}
	} catch (e) {
		// ignore
	}
	return url
}
