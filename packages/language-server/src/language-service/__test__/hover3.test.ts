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

let uri = "http://json.schemastore.org/bowerrc";
let languageSettings: LanguageSettings = {
  schemas: [],
  hover: false
};
let fileMatch = ["*.yml", "*.yaml"];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

describe("Yaml Hover with bowerrc", function() {
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

    it("Hover should not return anything", done => {
      let content = "cwd: test";
      let hover = parseSetup(content, 1);
      hover
        .then(function(result) {
          expect(result).toBeUndefined();
        })
        .then(done, done);
    });
  });
});
