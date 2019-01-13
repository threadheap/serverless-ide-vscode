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
  hover: true
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

    it("Hover on key on root", done => {
      let content = "cwd: test";
      let hover = parseSetup(content, 1);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover on value on root", done => {
      let content = "cwd: test";
      let hover = parseSetup(content, 6);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover on key with depth", done => {
      let content = "scripts:\n  postinstall: test";
      let hover = parseSetup(content, 15);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover on value with depth", done => {
      let content = "scripts:\n  postinstall: test";
      let hover = parseSetup(content, 26);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover works on both root node and child nodes works", done => {
      let content = "scripts:\n  postinstall: test";

      let firstHover = parseSetup(content, 3);
      firstHover.then(function(result) {
        expect(result.contents).not.toHaveLength(0);
      });

      let secondHover = parseSetup(content, 15);
      secondHover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover does not show results when there isnt description field", done => {
      let content = "analytics: true";
      let hover = parseSetup(content, 3);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });

    it("Hover on multi document", done => {
      let content = "---\nanalytics: true\n...\n---\njson: test\n...";
      let hover = parseSetup(content, 30);
      hover
        .then(function(result) {
          expect(result.contents).not.toHaveLength(0);
        })
        .then(done, done);
    });
  });
});
