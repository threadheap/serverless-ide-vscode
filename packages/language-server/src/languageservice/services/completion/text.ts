import { JSONSchema } from "../../jsonSchema";

export const getInsertTextForPlainText = (text: string): string => {
  return text.replace(/[\\\$\}]/g, "\\$&"); // escape $, \ and }
};

export const getInsertTextForValue = (
  value: any,
  separatorAfter: string
): string => {
  var text = value;
  if (text === "{}") {
    return "{\n\t$1\n}" + separatorAfter;
  } else if (text === "[]") {
    return "[\n\t$1\n]" + separatorAfter;
  }
  return this.getInsertTextForPlainText(text + separatorAfter);
};

export const getInsertTextForObject = (
  schema: JSONSchema,
  separatorAfter: string,
  indent = "\t",
  insertIndex = 1
) => {
  let insertText = "";
  if (!schema.properties) {
    insertText = `${indent}\$${insertIndex++}\n`;
    return { insertText, insertIndex };
  }

  Object.keys(schema.properties).forEach((key: string) => {
    let propertySchema = schema.properties[key];
    let type = Array.isArray(propertySchema.type)
      ? propertySchema.type[0]
      : propertySchema.type;
    if (!type) {
      if (propertySchema.properties) {
        type = "object";
      }
      if (propertySchema.items) {
        type = "array";
      }
      if (propertySchema.anyOf && propertySchema.anyOf.length > 0) {
        type = "anyOf";
      }
      if (propertySchema.oneOf && propertySchema.oneOf.length > 0) {
        type = "oneOf";
      }
    }
    if (schema.required && schema.required.indexOf(key) > -1) {
      switch (type) {
        case "boolean":
        case "string":
        case "number":
        case "integer":
          insertText += `${indent}${key}: \$${insertIndex++}\n`;
          break;
        case "array":
          let arrayInsertResult = this.getInsertTextForArray(
            propertySchema.items,
            separatorAfter,
            `${indent}\t`,
            insertIndex++
          );
          insertIndex = arrayInsertResult.insertIndex;
          insertText += `${indent}${key}:\n${indent}\t- ${
            arrayInsertResult.insertText
          }\n`;
          break;
        case "object": {
          let objectInsertResult = this.getInsertTextForObject(
            propertySchema,
            separatorAfter,
            `${indent}\t`,
            insertIndex++
          );
          insertIndex = objectInsertResult.insertIndex;
          insertText += `${indent}${key}:\n${objectInsertResult.insertText}\n`;
          break;
        }
        case "anyOf":
        case "oneOf": {
          insertText += `${indent}${this.getInsertTextForProperty(
            key,
            propertySchema[type][0],
            false,
            separatorAfter,
            insertIndex++
          )}\n`;
          break;
        }
      }
    } else if (propertySchema.default !== undefined) {
      switch (type) {
        case "boolean":
        case "string":
        case "number":
        case "integer":
          insertText += `${indent}${key}: \${${insertIndex++}:${
            propertySchema.default
          }}\n`;
          break;
        case "array":
        case "object":
          // TODO: support default value for array object
          break;
      }
    }
  });
  if (insertText.trim().length === 0) {
    insertText = `${indent}\$${insertIndex++}\n`;
  }
  insertText = insertText.trimRight() + separatorAfter;
  return { insertText, insertIndex };
};

export const getInsertTextForArray = (
  schema: JSONSchema,
  separatorAfter: string,
  indent = "\t",
  insertIndex = 1
) => {
  let insertText = "";
  if (!schema) {
    insertText = `\$${insertIndex++}`;
  }
  let type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (!type) {
    if (schema.properties) {
      type = "object";
    }
    if (schema.items) {
      type = "array";
    }
  }
  switch (schema.type) {
    case "boolean":
      insertText = `\${${insertIndex++}:false}`;
      break;
    case "number":
    case "integer":
      insertText = `\${${insertIndex++}:0}`;
      break;
    case "string":
      insertText = `\${${insertIndex++}:null}`;
      break;
    case "object":
      let objectInsertResult = this.getInsertTextForObject(
        schema,
        separatorAfter,
        `${indent}\t`,
        insertIndex++
      );
      insertText = objectInsertResult.insertText.trimLeft();
      insertIndex = objectInsertResult.insertIndex;
      break;
  }
  return { insertText, insertIndex };
};

export const getInsertTextForProperty = (
  key: string,
  propertySchema: JSONSchema,
  addValue: boolean,
  separatorAfter: string,
  insertIndex: number = 1
): string => {
  let propertyText = this.getInsertTextForValue(key, "");
  // if (!addValue) {
  // 	return propertyText;
  // }
  let resultText = propertyText + ":";

  let value;
  if (propertySchema) {
    if (propertySchema.default !== undefined) {
      value = ` \${${insertIndex}:${propertySchema.default}}`;
    } else if (propertySchema.properties) {
      return `${resultText}\n${
        this.getInsertTextForObject(propertySchema, separatorAfter).insertText
      }`;
    } else if (propertySchema.items) {
      return `${resultText}\n\t- ${
        this.getInsertTextForArray(propertySchema.items, separatorAfter)
          .insertText
      }`;
    } else {
      var type = Array.isArray(propertySchema.type)
        ? propertySchema.type[0]
        : propertySchema.type;
      switch (type) {
        case "boolean":
          value = ` $${insertIndex}`;
          break;
        case "string":
          value = ` $${insertIndex}`;
          break;
        case "object":
          value = "\n\t";
          break;
        case "array":
          value = "\n\t- ";
          break;
        case "number":
        case "integer":
          value = ` $\{${insertIndex}:0\}`;
          break;
        case "null":
          value = ` $\{${insertIndex}:null\}`;
          break;
        default:
          return propertyText;
      }
    }
  }
  if (!value) {
    value = `$${insertIndex}`;
  }
  return resultText + value + separatorAfter;
};
