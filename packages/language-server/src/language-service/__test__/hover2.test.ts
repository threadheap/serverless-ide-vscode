import { TextDocument } from "vscode-languageserver";
import { getLanguageService, LanguageSettings } from "../languageService";
import { schemaRequestService, workspaceContext } from "./testHelper";
import { parse as parseYAML } from "../parser/yamlParser";

let languageService = getLanguageService(
  schemaRequestService,
  workspaceContext,
  [],
  null
);

let uri = "http://json.schemastore.org/composer";
let languageSettings: LanguageSettings = {
  schemas: [],
  hover: true
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

describe("Yaml Hover with composer schema", function() {
  describe("doComplete", function() {
    function setup(content: string) {
      return TextDocument.create(
        "file://~/Desktop/vscode-k8s/test.yaml",
        "yaml",
        0,
        content
      );
    }

    function parseSetup(content: string, position) {
      let testTextDocument = setup(content);
      let jsonDocument = parseYAML(testTextDocument.getText());
      return languageService.doHover(
        testTextDocument,
        testTextDocument.positionAt(position),
        jsonDocument
      );
    }

    it("Hover works on array nodes", done => {
      let content = "authors:\n  - name: Josh";
      let hover = parseSetup(content, 14);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover works on array nodes 2", done => {
      let content = "authors:\n  - name: Josh\n  - email: jp";
      let hover = parseSetup(content, 28);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });
  });
});
