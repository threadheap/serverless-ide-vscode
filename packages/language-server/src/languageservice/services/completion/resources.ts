import { JSONSchema } from "../../jsonSchema";
import { SingleYAMLDocument } from "../../parser/yamlParser";
import { PropertyASTNode } from "../../parser/jsonParser";
import { ResolvedSchema } from "../jsonSchemaService";
import { forEach } from "lodash";

export const getResourcesCompltions = (
  schema: ResolvedSchema,
  doc: SingleYAMLDocument,
  node: PropertyASTNode,
  offset: number
) => {
  const schemas = doc.getMatchingSchemas(schema.schema, offset);

  schemas.forEach(schema => {
    if (schema.node === node) {
      if (schema.schema.patternProperties) {
        const { patternProperties } = schema.schema;

        forEach(patternProperties, (propertiesSchema: JSONSchema) => {
          if (propertiesSchema.anyOf) {
          }
        });
      }
    }
  });
};
