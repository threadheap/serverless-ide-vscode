import * as JSONParser from "jsonc-parser";
import { CompletionItemKind, TextDocument } from "vscode-languageserver-types";
import { ASTNode } from "./../../parser/jsonParser";

export const getLabelForValue = (value: any): string => {
  let label = typeof value === "string" ? value : JSON.stringify(value);
  if (label.length > 57) {
    return label.substr(0, 57).trim() + "...";
  }
  return label;
};

export const getSuggestionKind = (type: any): CompletionItemKind => {
  if (Array.isArray(type)) {
    let array = <any[]>type;
    type = array.length > 0 ? array[0] : null;
  }
  if (!type) {
    return CompletionItemKind.Value;
  }
  switch (type) {
    case "string":
      return CompletionItemKind.Value;
    case "object":
      return CompletionItemKind.Module;
    case "property":
      return CompletionItemKind.Property;
    default:
      return CompletionItemKind.Value;
  }
};

export const getCurrentWord = (document: TextDocument, offset: number) => {
  var i = offset - 1;
  var text = document.getText();
  while (i >= 0 && ' \t\n\r\v":{[,]}'.indexOf(text.charAt(i)) === -1) {
    i--;
  }
  return text.substring(i + 1, offset);
};

export const findItemAtOffset = (
  node: ASTNode,
  document: TextDocument,
  offset: number
) => {
  let scanner = JSONParser.createScanner(document.getText(), true);
  let children = node.getChildNodes();
  for (let i = children.length - 1; i >= 0; i--) {
    let child = children[i];
    if (offset > child.end) {
      scanner.setPosition(child.end);
      let token = scanner.scan();
      if (
        token === JSONParser.SyntaxKind.CommaToken &&
        offset >= scanner.getTokenOffset() + scanner.getTokenLength()
      ) {
        return i + 1;
      }
      return i;
    } else if (offset >= child.start) {
      return i;
    }
  }
  return 0;
};

export const isInComment = (
  document: TextDocument,
  start: number,
  offset: number
) => {
  let scanner = JSONParser.createScanner(document.getText(), false);
  scanner.setPosition(start);
  let token = scanner.scan();
  while (
    token !== JSONParser.SyntaxKind.EOF &&
    scanner.getTokenOffset() + scanner.getTokenLength() < offset
  ) {
    token = scanner.scan();
  }
  return (
    (token === JSONParser.SyntaxKind.LineCommentTrivia ||
      token === JSONParser.SyntaxKind.BlockCommentTrivia) &&
    scanner.getTokenOffset() <= offset
  );
};

export const evaluateSeparatorAfter = (
  document: TextDocument,
  offset: number
) => {
  let scanner = JSONParser.createScanner(document.getText(), true);
  scanner.setPosition(offset);
  let token = scanner.scan();
  switch (token) {
    case JSONParser.SyntaxKind.CommaToken:
    case JSONParser.SyntaxKind.CloseBraceToken:
    case JSONParser.SyntaxKind.CloseBracketToken:
    case JSONParser.SyntaxKind.EOF:
      return "";
    default:
      return "";
  }
};
