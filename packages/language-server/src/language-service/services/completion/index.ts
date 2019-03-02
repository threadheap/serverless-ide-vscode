'use strict';

import * as Parser from '../../parser/jsonParser';
import * as SchemaService from '../jsonSchema';
import {
	JSONWorkerContribution,
	CompletionsCollector
} from '../../jsonContributions';
import { PromiseConstructor, Thenable } from 'vscode-json-languageservice';

import {
	CompletionItem,
	CompletionItemKind,
	CompletionList,
	TextDocument,
	Position,
	Range,
	TextEdit,
	InsertTextFormat
} from 'vscode-languageserver-types';

import { matchOffsetToDocument } from '../../utils/arrayUtils';
import { LanguageSettings } from '../../languageService';
import { YAMLDocument } from '../../parser';
import * as textCompletions from './text';
import * as completions from './completions';
import * as helpers from './helpers';

export class YAMLCompletion {
	private schemaService: SchemaService.IJSONSchemaService;
	private contributions: JSONWorkerContribution[];
	private promise: PromiseConstructor;
	private customTags: Array<String>;
	private completion: boolean;

	constructor(
		schemaService: SchemaService.IJSONSchemaService,
		contributions: JSONWorkerContribution[] = [],
		promiseConstructor?: PromiseConstructor
	) {
		this.schemaService = schemaService;
		this.contributions = contributions;
		this.promise = promiseConstructor || Promise;
		this.customTags = [];
		this.completion = true;
	}

	public configure(
		languageSettings: LanguageSettings,
		customTags: Array<String>
	) {
		if (languageSettings) {
			this.completion = languageSettings.completion;
		}
		this.customTags = customTags;
	}

	public doResolve(item: CompletionItem): Thenable<CompletionItem> {
		for (let i = this.contributions.length - 1; i >= 0; i--) {
			if (this.contributions[i].resolveCompletion) {
				let resolver = this.contributions[i].resolveCompletion(item);
				if (resolver) {
					return resolver;
				}
			}
		}
		return this.promise.resolve(item);
	}

	public async doComplete(
		document: TextDocument,
		position: Position,
		doc: YAMLDocument
	): Promise<CompletionList> {
		let result: CompletionList = {
			items: [],
			isIncomplete: false
		};

		if (!this.completion) {
			return Promise.resolve(result);
		}

		let offset = document.offsetAt(position);
		if (document.getText()[offset] === ':') {
			return Promise.resolve(result);
		}

		let currentDoc = matchOffsetToDocument(offset, doc);
		if (currentDoc === null) {
			return Promise.resolve(result);
		}
		const currentDocIndex = doc.documents.indexOf(currentDoc);
		let node = currentDoc.getNodeFromOffsetEndInclusive(offset);
		if (helpers.isInComment(document, node ? node.start : 0, offset)) {
			return Promise.resolve(result);
		}

		let currentWord = helpers.getCurrentWord(document, offset);

		let overwriteRange = null;
		if (node && node.type === 'null') {
			let nodeStartPos = document.positionAt(node.start);
			nodeStartPos.character += 1;
			let nodeEndPos = document.positionAt(node.end);
			nodeEndPos.character += 1;
			overwriteRange = Range.create(nodeStartPos, nodeEndPos);
		} else if (
			node &&
			(node.type === 'string' ||
				node.type === 'number' ||
				node.type === 'boolean')
		) {
			overwriteRange = Range.create(
				document.positionAt(node.start),
				document.positionAt(node.end)
			);
		} else {
			let overwriteStart = offset - currentWord.length;
			if (
				overwriteStart > 0 &&
				document.getText()[overwriteStart - 1] === '"'
			) {
				overwriteStart--;
			}
			overwriteRange = Range.create(
				document.positionAt(overwriteStart),
				position
			);
		}

		let proposed: { [key: string]: CompletionItem } = {};
		let collector: CompletionsCollector = {
			add: (suggestion: CompletionItem) => {
				let existing = proposed[suggestion.label];
				if (!existing) {
					proposed[suggestion.label] = suggestion;
					if (overwriteRange) {
						suggestion.textEdit = TextEdit.replace(
							overwriteRange,
							suggestion.insertText
						);
					}
					result.items.push(suggestion);
				} else if (!existing.documentation) {
					existing.documentation = suggestion.documentation;
				}
			},
			setAsIncomplete: () => {
				result.isIncomplete = true;
			},
			error: (message: string) => {
				console.error(message);
			},
			log: (message: string) => {
				console.log(message);
			},
			getNumberOfProposals: () => {
				return result.items.length;
			}
		};

		const schema = await this.schemaService.getSchemaForDocument(
			document.uri,
			currentDoc,
			currentDocIndex
		);

		if (!schema) {
			return Promise.resolve(result);
		}

		let collectionPromises: Thenable<any>[] = [];

		let addValue = true;

		let currentProperty: Parser.PropertyASTNode = null;
		if (node) {
			if (node.type === 'string') {
				let stringNode = <Parser.StringASTNode>node;
				if (stringNode.isKey) {
					addValue = !(
						node.parent &&
						(<Parser.PropertyASTNode>node.parent).value
					);
					currentProperty = node.parent
						? <Parser.PropertyASTNode>node.parent
						: null;
					if (node.parent) {
						node = node.parent.parent;
					}
				}
			}
		}

		// proposals for properties
		if (node && node.type === 'object') {
			// don't suggest properties that are already present
			let properties = (<Parser.ObjectASTNode>node).properties;
			properties.forEach(p => {
				if (!currentProperty || currentProperty !== p) {
					proposed[p.key.value] = CompletionItem.create('__');
				}
			});

			let separatorAfter = '';
			if (addValue) {
				separatorAfter = helpers.evaluateSeparatorAfter(
					document,
					document.offsetAt(overwriteRange.end)
				);
			}

			// property proposals with schema
			completions.getPropertyCompletions(
				schema,
				currentDoc,
				node,
				addValue,
				collector,
				separatorAfter
			);

			let location = node.getPath();
			this.contributions.forEach(contribution => {
				let collectPromise = contribution.collectPropertyCompletions(
					document.uri,
					location,
					currentWord,
					addValue,
					false,
					collector
				);
				if (collectPromise) {
					collectionPromises.push(collectPromise);
				}
			});
		}

		// property proposal for values
		completions.getValueCompletions(
			schema,
			currentDoc,
			node,
			offset,
			document,
			collector
		);
		if (this.contributions.length > 0) {
			completions.getContributedValueCompletions(
				this.contributions,
				node,
				offset,
				document,
				collector,
				collectionPromises
			);
		}
		if (this.customTags.length > 0) {
			completions.getCustomTagValueCompletions(
				collector,
				this.customTags
			);
		}

		return this.promise.all(collectionPromises).then(() => {
			return result;
		});
	}
}
