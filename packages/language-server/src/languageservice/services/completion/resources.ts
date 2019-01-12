import {
  CompletionItemKind,
  InsertTextFormat
} from "vscode-languageserver-types";
import { CompletionsCollector } from "./../../jsonContributions";
import { JSONSchema } from "../../jsonSchema";
import { SingleYAMLDocument } from "../../parser/yamlParser";
import { ResolvedSchema } from "../jsonSchemaService";
import { forEach } from "lodash";
import { getInsertTextForObject } from "./text";

const getResourceType = (schema: JSONSchema): string | null => {
  if (schema.properties && schema.properties.Type) {
    const typeEnum = schema.properties.Type;

    if (typeEnum.enum && typeEnum.enum.length === 1) {
      return typeEnum.enum[0];
    }
  }

  return null;
};

export const getResourcesCompletions = (
  schema: ResolvedSchema,
  doc: SingleYAMLDocument,
  offset: number,
  separatorAfter: string,
  collector: CompletionsCollector,
  indent = "\t"
) => {
  const schemas = doc.getMatchingSchemas(schema.schema, offset);

  schemas.forEach(schema => {
    if (schema.schema.patternProperties) {
      const { patternProperties } = schema.schema;

      forEach(patternProperties, (propertiesSchema: JSONSchema) => {
        if (propertiesSchema.anyOf) {
          propertiesSchema.anyOf.forEach(propertySchema => {
            const resourceType = getResourceType(propertySchema);

            if (resourceType) {
              const insertText = getInsertTextForObject(
                propertySchema,
                separatorAfter,
                indent,
                2
              );

              const label = resourceType.replace("AWS::", "");
              const key = label.split("::")[1];
              const text = `\${1:${key}}:\n${indent}${insertText.insertText.trimLeft()}`;

              collector.add({
                kind: CompletionItemKind.Snippet,
                label,
                insertText: text,
                insertTextFormat: InsertTextFormat.Snippet,
                documentation: propertySchema.description || ""
              });
            }
          });
        }
      });
    }
  });
};
