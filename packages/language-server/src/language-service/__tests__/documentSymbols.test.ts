import { TextDocument } from 'vscode-languageserver';
import { getLanguageService } from '../languageService';
import { workspaceContext } from './testHelper';
import { parse as parseYAML } from '../parser/yamlParser';

let languageService = getLanguageService(workspaceContext, [], null);

describe('Document Symbols Tests', function() {
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
		let jsonDocument = parseYAML(testTextDocument.getText());
		return languageService.findDocumentSymbols(
			testTextDocument,
			jsonDocument
		);
	}

	it('Document is empty', done => {
		let content = '';
		let symbols = parseSetup(content);
		expect(symbols).toBe(null);
		done();
	});

	it('Simple document symbols', done => {
		let content = 'cwd: test';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(1);
		done();
	});

	it('Document Symbols with number', done => {
		let content = 'node1: 10000';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(1);
		done();
	});

	it('Document Symbols with boolean', done => {
		let content = 'node1: False';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(1);
		done();
	});

	it('Document Symbols with object', done => {
		let content = 'scripts:\n  node1: test\n  node2: test';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(3);
		done();
	});

	it('Document Symbols with null', done => {
		let content = 'apiVersion: null';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(1);
		done();
	});

	it('Document Symbols with array of strings', done => {
		let content = 'items:\n  - test\n  - test';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(1);
		done();
	});

	it('Document Symbols with array', done => {
		let content = 'authors:\n  - name: Josh\n  - email: jp';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(3);
		done();
	});

	it('Document Symbols with object and array', done => {
		let content =
			'scripts:\n  node1: test\n  node2: test\nauthors:\n  - name: Josh\n  - email: jp';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(6);
		done();
	});

	it('Document Symbols with multi documents', done => {
		let content = '---\nanalytics: true\n...\n---\njson: test\n...';
		let symbols = parseSetup(content);
		expect(symbols).toHaveLength(2);
		done();
	});
});
