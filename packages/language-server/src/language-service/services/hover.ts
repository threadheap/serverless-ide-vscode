import * as Parser from '../parser/jsonParser';
import * as SchemaService from './jsonSchemaService';
import { DocumentationService } from './documentation';

import {
	Hover,
	TextDocument,
	Position,
	Range,
	MarkedString
} from 'vscode-languageserver-types';
import { matchOffsetToDocument } from '../utils/arrayUtils';
import { LanguageSettings } from '../languageService';

const createHover = (contents: MarkedString[], hoverRange: Range): Hover => {
	let result: Hover = {
		contents: contents,
		range: hoverRange
	};
	return result;
};

export class YAMLHover {
	private schemaService: SchemaService.IJSONSchemaService;
	private shouldHover: boolean;
	private documentationService: DocumentationService;

	constructor(schemaService: SchemaService.IJSONSchemaService) {
		this.schemaService = schemaService;
		this.shouldHover = true;
		this.documentationService = new DocumentationService(
			'https://d1uauaxba7bl26.cloudfront.net/latest/gzip/CloudFormationResourceSpecification.json'
		);
	}

	private getResourceName(node: Parser.ASTNode): void | string {
		const path = node.getPath();

		const getResourceName = (targetNode: Parser.ASTNode): string | void => {
			if (targetNode.type !== 'object') {
				return;
			}

			const children = targetNode.getChildNodes();
			let resourceType: string | void;

			children.find(child => {
				if (child && child.type === 'property') {
					const property = child as Parser.PropertyASTNode;

					if (property.key.location === 'Type') {
						const resourceTypeValue =
							property.value && property.value.getValue();

						if (
							resourceTypeValue &&
							resourceTypeValue.indexOf('AWS::') === 0
						) {
							resourceType = resourceTypeValue;
							return true;
						}
					}
				}

				return false;
			});

			return resourceType;
		};

		if (path[0] === 'Resources' && path.length > 1) {
			let currentNode = node.parent;
			let resourceName = getResourceName(node);
			let depth = 0;
			const maxDepth = 7;

			while (
				resourceName === undefined &&
				currentNode &&
				depth < maxDepth
			) {
				resourceName = getResourceName(currentNode);
				currentNode = currentNode.parent;
				depth += 1;
			}

			return resourceName;
		}
	}

	private getPropertyName(node: Parser.ASTNode): string | void {
		const path = node.getPath();

		if (
			path.length >= 4 &&
			path[0] === 'Resources' &&
			path[2] === 'Properties'
		) {
			return path[3] as string;
		}
	}

	public configure(languageSettings: LanguageSettings) {
		if (languageSettings) {
			this.shouldHover = languageSettings.hover;
		}
	}

	public async doHover(
		document: TextDocument,
		position: Position,
		doc
	): Promise<Hover> {
		if (!this.shouldHover || !document) {
			return Promise.resolve(void 0);
		}

		const schema = await this.schemaService.getSchemaForResource(
			document.uri
		);

		if (!schema) {
			return;
		}

		let offset = document.offsetAt(position);
		let currentDoc = matchOffsetToDocument(offset, doc);
		if (currentDoc === null) {
			return Promise.resolve(void 0);
		}
		const currentDocIndex = doc.documents.indexOf(currentDoc);
		let node = currentDoc.getNodeFromOffset(offset);

		if (
			!node ||
			((node.type === 'object' || node.type === 'array') &&
				offset > node.start + 1 &&
				offset < node.end - 1)
		) {
			return Promise.resolve(void 0);
		}
		let hoverRangeNode = node;
		let hoverRange = Range.create(
			document.positionAt(hoverRangeNode.start),
			document.positionAt(hoverRangeNode.end)
		);

		if (node.getPath().length >= 2) {
			const resourceType = this.getResourceName(node);
			const propertyName = this.getPropertyName(node);

			if (resourceType) {
				let markdown: string | void;

				if (propertyName) {
					markdown = await this.documentationService.getPropertyDocumentation(
						resourceType,
						String(propertyName)
					);
				} else {
					markdown = await this.documentationService.getResourceDocumentation(
						resourceType
					);
				}

				if (markdown) {
					return createHover([markdown], hoverRange);
				}
			}
		}

		return void 0;
	}
}
