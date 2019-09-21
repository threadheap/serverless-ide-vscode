import { YAMLDocument } from "../index"
import { ASTNode } from "./ast-node"
import * as Json from "jsonc-parser"
import { JSONSchema } from "../../jsonSchema"
import * as Path from "path"

const IMPORT_REGEXP = /^\${file\((.+)\.(yml|yaml)\)(:\w+)?}$/
const FILE_URI_PREFIX = "file://"

export type OnRegisterExternalImport = (uri: string, parentUri: string) => void

export type OnValidateExternalImport = (
	uri: string,
	parentUri: string,
	schema: JSONSchema,
	property: string | void
) => void

export interface ExternalImportsCallbacks {
	onRegisterExternalImport: OnRegisterExternalImport
	onValidateExternalImport: OnValidateExternalImport
}

export class ExternalImportASTNode extends ASTNode<string> {
	static isImportPath(path: string) {
		return IMPORT_REGEXP.test(path)
	}

	private uri: string | void
	private parameter: string | void = undefined
	private callbacks: ExternalImportsCallbacks

	constructor(
		document: YAMLDocument,
		parent: ASTNode,
		name: Json.Segment,
		value: string,
		start: number,
		end: number,
		callbacks: ExternalImportsCallbacks
	) {
		super(document, parent, "string", name, start, end)
		this.callbacks = callbacks
		this.value = value
	}

	set value(newValue: string) {
		const [, path, extension, parameter] = IMPORT_REGEXP.exec(newValue)

		this.uri = this.resolvePath(`${path}.${extension}`)
		this.parameter = parameter

		if (this.uri) {
			this.callbacks.onRegisterExternalImport(this.uri, this.document.uri)
		}
	}

	validate(schema: JSONSchema): void {
		if (this.uri) {
			this.callbacks.onValidateExternalImport(
				this.uri,
				this.document.uri,
				schema,
				this.parameter
			)
		}
	}

	private resolvePath(path: string): string | void {
		if (Path.isAbsolute(path)) {
			return path
		} else {
			if (this.document.uri.startsWith(FILE_URI_PREFIX)) {
				return (
					FILE_URI_PREFIX +
					Path.join(
						Path.dirname(
							this.document.uri.replace(FILE_URI_PREFIX, "")
						),
						path
					)
				)
			}
		}
	}
}
