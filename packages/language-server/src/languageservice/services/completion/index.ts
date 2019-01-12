/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
"use strict";

import * as Parser from "../../parser/jsonParser";
import * as SchemaService from "../jsonSchemaService";
import {
  JSONWorkerContribution,
  CompletionsCollector
} from "../../jsonContributions";
import { PromiseConstructor, Thenable } from "vscode-json-languageservice";

import {
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  TextDocument,
  Position,
  Range,
  TextEdit,
  InsertTextFormat
} from "vscode-languageserver-types";

import { matchOffsetToDocument } from "../../utils/arrUtils";
import { LanguageSettings } from "../../languageService";
import { YAMLDocument } from "../../parser/yamlParser";
import * as textCompletions from "./text";
import * as completions from "./completions";
import * as helpers from "./helpers";

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

  public doComplete(
    document: TextDocument,
    position: Position,
    doc: YAMLDocument
  ): Thenable<CompletionList> {
    let result: CompletionList = {
      items: [],
      isIncomplete: false
    };

    if (!this.completion) {
      return Promise.resolve(result);
    }

    let offset = document.offsetAt(position);
    if (document.getText()[offset] === ":") {
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
    if (node && node.type === "null") {
      let nodeStartPos = document.positionAt(node.start);
      nodeStartPos.character += 1;
      let nodeEndPos = document.positionAt(node.end);
      nodeEndPos.character += 1;
      overwriteRange = Range.create(nodeStartPos, nodeEndPos);
    } else if (
      node &&
      (node.type === "string" ||
        node.type === "number" ||
        node.type === "boolean")
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

    return this.schemaService
      .getSchemaForResource(document.uri)
      .then(schema => {
        if (!schema) {
          return Promise.resolve(result);
        }
        let newSchema = schema;
        if (
          schema.schema &&
          schema.schema.schemaSequence &&
          schema.schema.schemaSequence[currentDocIndex]
        ) {
          newSchema = new SchemaService.ResolvedSchema(
            schema.schema.schemaSequence[currentDocIndex]
          );
        }

        let collectionPromises: Thenable<any>[] = [];

        let addValue = true;
        let currentKey = "";

        let currentProperty: Parser.PropertyASTNode = null;
        if (node) {
          if (node.type === "string") {
            let stringNode = <Parser.StringASTNode>node;
            if (stringNode.isKey) {
              addValue = !(
                node.parent && (<Parser.PropertyASTNode>node.parent).value
              );
              currentProperty = node.parent
                ? <Parser.PropertyASTNode>node.parent
                : null;
              currentKey = document
                .getText()
                .substring(node.start + 1, node.end - 1);
              if (node.parent) {
                node = node.parent.parent;
              }
            }
          }
        }

        // proposals for properties
        if (node && node.type === "object") {
          // don't suggest properties that are already present
          let properties = (<Parser.ObjectASTNode>node).properties;
          properties.forEach(p => {
            if (!currentProperty || currentProperty !== p) {
              proposed[p.key.value] = CompletionItem.create("__");
            }
          });

          let separatorAfter = "";
          if (addValue) {
            separatorAfter = helpers.evaluateSeparatorAfter(
              document,
              document.offsetAt(overwriteRange.end)
            );
          }

          if (newSchema) {
            // property proposals with schema
            completions.getPropertyCompletions(
              newSchema,
              currentDoc,
              node,
              addValue,
              collector,
              separatorAfter
            );
          }

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
          if (
            !schema &&
            currentWord.length > 0 &&
            document.getText().charAt(offset - currentWord.length - 1) !== '"'
          ) {
            collector.add({
              kind: CompletionItemKind.Property,
              label: helpers.getLabelForValue(currentWord),
              insertText: textCompletions.getInsertTextForProperty(
                currentWord,
                null,
                false,
                separatorAfter
              ),
              insertTextFormat: InsertTextFormat.Snippet,
              documentation: ""
            });
          }
        }

        // proposals for values
        if (newSchema) {
          completions.getValueCompletions(
            newSchema,
            currentDoc,
            node,
            offset,
            document,
            collector
          );
        }
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
          completions.getCustomTagValueCompletions(collector, this.customTags);
        }

        return this.promise.all(collectionPromises).then(() => {
          return result;
        });
      });
  }
}
