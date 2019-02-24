import { TextDocument } from 'vscode-languageserver';
import { getLanguageService } from '../languageService';
import { workspaceContext } from './testHelper';
import { parse as parseYAML } from '../parser/yamlParser';

let languageService = getLanguageService(workspaceContext, [], null);

let uri = 'SchemaDoesNotExist';
let languageSettings = {
	schemas: [],
	validate: true,
	customTags: []
};
let fileMatch = ['*.yml', '*.yaml'];
languageSettings.schemas.push({ uri, fileMatch: fileMatch });
languageService.configure(languageSettings);

// Tests for validator
describe('Validation', function() {
	function setup(content: string) {
		return TextDocument.create(
			'file://~/Desktop/vscode-k8s/test.yaml',
			'yaml',
			0,
			content
		);
	}

	function parseSetup(content: string) {
		let testTextDocument = setup(content);
		let yDoc = parseYAML(
			testTextDocument.getText(),
			languageSettings.customTags
		);
		return languageService.doValidation(testTextDocument, yDoc);
	}

	//Validating basic nodes
	describe('Test that validation throws error when schema is not found', function() {
		it('Basic test', done => {
			let content = `testing: true`;
			let validator = parseSetup(content);
			validator
				.then(function(result) {
					expect(result).not.toHaveLength(0);
				})
				.then(done, done);
		});
	});
});
