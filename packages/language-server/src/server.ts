'use strict';

import {
	createConnection,
	IConnection,
	TextDocuments,
	TextDocument,
	InitializeParams,
	InitializeResult,
	NotificationType,
	RequestType,
	Position,
	ProposedFeatures,
	CompletionList
} from 'vscode-languageserver';

import {
	xhr,
	XHRResponse,
	configure as configureHttpRequests,
	getErrorStatusDescription
} from 'request-light';
import path = require('path');
import fs = require('fs');
import URI from './language-service/utils/uri';
import * as URL from 'url';
import Strings = require('./language-service/utils/strings');
import {
	getLineOffsets,
	removeDuplicatesObj
} from './language-service/utils/arrayUtils';
import {
	getLanguageService as getCustomLanguageService,
	LanguageSettings,
	CustomFormatterOptions
} from './language-service/languageService';
import * as nls from 'vscode-nls';
import { CustomSchemaProvider } from './language-service/services/jsonSchemaService';
import { parse as parseYAML } from './language-service/parser/yamlParser';
import { JSONSchema } from './language-service/jsonSchema';
nls.config(<any>process.env['VSCODE_NLS_CONFIG']);

interface ISchemaAssociations {
	[pattern: string]: string[];
}

namespace SchemaAssociationNotification {
	export const type: NotificationType<{}, {}> = new NotificationType(
		'json/schemaAssociations'
	);
}

namespace DynamicCustomSchemaRequestRegistration {
	export const type: NotificationType<{}, {}> = new NotificationType(
		'yaml/registerCustomSchemaRequest'
	);
}

namespace VSCodeContentRequest {
	export const type: RequestType<{}, {}, {}, {}> = new RequestType(
		'vscode/content'
	);
}

namespace CustomSchemaContentRequest {
	export const type: RequestType<{}, {}, {}, {}> = new RequestType(
		'custom/schema/content'
	);
}

namespace CustomSchemaRequest {
	export const type: RequestType<{}, {}, {}, {}> = new RequestType(
		'custom/schema/request'
	);
}

namespace ColorSymbolRequest {
	export const type: RequestType<{}, {}, {}, {}> = new RequestType(
		'json/colorSymbols'
	);
}

// Create a connection for the server.
let connection: IConnection = null;
if (process.argv.indexOf('--stdio') == -1) {
	connection = createConnection(ProposedFeatures.all);
} else {
	connection = createConnection();
}

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let hasWorkspaceFolderCapability = false;

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
let capabilities;
let workspaceFolders = [];
let workspaceRoot: URI;
connection.onInitialize(
	(params: InitializeParams): InitializeResult => {
		capabilities = params.capabilities;
		workspaceFolders = params['workspaceFolders'];
		workspaceRoot = URI.parse(params.rootPath);

		hasWorkspaceFolderCapability =
			capabilities.workspace && !!capabilities.workspace.workspaceFolders;
		return {
			capabilities: {
				textDocumentSync: documents.syncKind,
				completionProvider: { resolveProvider: true },
				hoverProvider: true,
				documentSymbolProvider: true,
				documentFormattingProvider: false
			}
		};
	}
);

let workspaceContext = {
	resolveRelativePath: (relativePath: string, resource: string) => {
		return URL.resolve(resource, relativePath);
	}
};

let schemaRequestService = (uri: string): Thenable<string> => {
	//For the case when we are multi root and specify a workspace location
	if (hasWorkspaceFolderCapability) {
		for (let folder in workspaceFolders) {
			let currFolder = workspaceFolders[folder];
			let currFolderUri = currFolder['uri'];
			let currFolderName = currFolder['name'];

			let isUriRegex = new RegExp('^(?:[a-z]+:)?//', 'i');
			if (uri.indexOf(currFolderName) !== -1 && !uri.match(isUriRegex)) {
				let beforeFolderName = currFolderUri.split(currFolderName)[0];
				let uriSplit = uri.split(currFolderName);
				uriSplit.shift();
				let afterFolderName = uriSplit.join(currFolderName);
				uri = beforeFolderName + currFolderName + afterFolderName;
			}
		}
	}
	if (Strings.startsWith(uri, 'file://')) {
		let fsPath = URI.parse(uri).fsPath;
		return new Promise<string>((c, e) => {
			fs.readFile(fsPath, 'UTF-8', (err, result) => {
				err ? e('') : c(result.toString());
			});
		});
	} else if (Strings.startsWith(uri, 'vscode://')) {
		return connection.sendRequest(VSCodeContentRequest.type, uri).then(
			responseText => {
				return responseText;
			},
			error => {
				return error.message;
			}
		);
	} else {
		let scheme = URI.parse(uri).scheme.toLowerCase();
		if (scheme !== 'http' && scheme !== 'https') {
			// custom scheme
			return <Thenable<string>>(
				connection.sendRequest(CustomSchemaContentRequest.type, uri)
			);
		}
	}
	let headers = { 'Accept-Encoding': 'gzip, deflate' };
	return xhr({ url: uri, followRedirects: 5, headers }).then(
		response => {
			return response.responseText;
		},
		(error: XHRResponse) => {
			return Promise.reject(
				error.responseText ||
					getErrorStatusDescription(error.status) ||
					error.toString()
			);
		}
	);
};

export let customLanguageService = getCustomLanguageService(
	schemaRequestService,
	workspaceContext,
	[]
);

interface ProvidersConfig {
	['aws-sam']?: string;
	['aws-cloudformation']?: string;
}

// The settings interface describes the server relevant settings part
interface Settings {
	serverlessIDE: {
		providers: ProvidersConfig;
		validate: boolean;
		hover: boolean;
		completion: boolean;
	};
	http: {
		proxy: string;
		proxyStrictSSL: boolean;
	};
}

let providersConfig: ProvidersConfig = void 0;
let schemaAssociations: ISchemaAssociations = void 0;
let schemaConfigurationSettings = [];
let yamlShouldValidate = true;
let yamlShouldHover = true;
let yamlShouldCompletion = true;
let schemaStoreSettings = [];
const customTags = [
	'!And sequence',
	'!Equals sequence',
	'!If sequence',
	'!Not sequence',
	'!Or sequence',
	'!Base64',
	'!Cidr sequence',
	'!FindInMap sequence',
	'!GetAtt',
	'!GetAZs',
	'!ImportValue',
	'!Join sequence',
	'!Select sequence',
	'!Split sequence',
	'!Sub',
	'!Ref'
];

connection.onDidChangeConfiguration(change => {
	var settings = <Settings>change.settings;
	configureHttpRequests(
		settings.http && settings.http.proxy,
		settings.http && settings.http.proxyStrictSSL
	);

	if (settings.serverlessIDE) {
		providersConfig = settings.serverlessIDE.providers;
		yamlShouldValidate = settings.serverlessIDE.validate;
		yamlShouldHover = settings.serverlessIDE.hover;
		yamlShouldCompletion = settings.serverlessIDE.completion;
	}

	// add default schema
	schemaConfigurationSettings = [];

	if (providersConfig['aws-sam']) {
		schemaConfigurationSettings.push({
			fileMatch: [providersConfig['aws-sam']],
			schema: require('@serverless-ide/sam-schema/schema.json')
		});
	}

	if (providersConfig['aws-cloudformation']) {
		schemaConfigurationSettings.push({
			fileMatch: [providersConfig['aws-cloudformation']],
			url:
				'https://raw.githubusercontent.com/awslabs/goformation/master/schema/cloudformation.schema.json'
		});
	}

	updateConfiguration();
});

connection.onNotification(SchemaAssociationNotification.type, associations => {
	schemaAssociations = associations;
	updateConfiguration();
});

connection.onNotification(DynamicCustomSchemaRequestRegistration.type, () => {
	const schemaProvider = (resource =>
		connection.sendRequest(
			CustomSchemaRequest.type,
			resource
		)) as CustomSchemaProvider;
	customLanguageService.registerCustomSchemaProvider(schemaProvider);
});

function updateConfiguration() {
	let languageSettings: LanguageSettings = {
		validate: yamlShouldValidate,
		hover: yamlShouldHover,
		completion: yamlShouldCompletion,
		schemas: [],
		customTags: customTags
	};
	if (schemaAssociations) {
		for (var pattern in schemaAssociations) {
			let association = schemaAssociations[pattern];
			if (Array.isArray(association)) {
				association.forEach(uri => {
					languageSettings = configureSchemas(
						uri,
						[pattern],
						null,
						languageSettings
					);
				});
			}
		}
	}
	if (schemaConfigurationSettings) {
		schemaConfigurationSettings.forEach(schema => {
			let uri = schema.url;
			if (!uri && schema.schema) {
				uri = schema.schema.id;
			}
			if (!uri && schema.fileMatch) {
				uri =
					'vscode://schemas/custom/' +
					encodeURIComponent(schema.fileMatch.join('&'));
			}
			if (uri) {
				if (
					uri[0] === '.' &&
					workspaceRoot &&
					!hasWorkspaceFolderCapability
				) {
					// workspace relative path
					uri = URI.file(
						path.normalize(path.join(workspaceRoot.fsPath, uri))
					).toString();
				}
				languageSettings = configureSchemas(
					uri,
					schema.fileMatch,
					schema.schema,
					languageSettings
				);
			}
		});
	}
	if (schemaStoreSettings) {
		languageSettings.schemas = languageSettings.schemas.concat(
			schemaStoreSettings
		);
	}
	customLanguageService.configure(languageSettings);

	// Revalidate any open text documents
	documents.all().forEach(triggerValidation);
}

function configureSchemas(uri, fileMatch, schema, languageSettings) {
	if (schema === null) {
		languageSettings.schemas.push({ uri, fileMatch: fileMatch });
	} else {
		languageSettings.schemas.push({
			uri,
			fileMatch: fileMatch,
			schema: schema
		});
	}

	return languageSettings;
}

documents.onDidChangeContent(change => {
	triggerValidation(change.document);
});

documents.onDidClose(event => {
	cleanPendingValidation(event.document);
	connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

let pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 200;

function cleanPendingValidation(textDocument: TextDocument): void {
	let request = pendingValidationRequests[textDocument.uri];
	if (request) {
		clearTimeout(request);
		delete pendingValidationRequests[textDocument.uri];
	}
}

function triggerValidation(textDocument: TextDocument): void {
	cleanPendingValidation(textDocument);
	pendingValidationRequests[textDocument.uri] = setTimeout(() => {
		delete pendingValidationRequests[textDocument.uri];
		validateTextDocument(textDocument);
	}, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument): void {
	if (!textDocument) {
		return;
	}

	if (textDocument.getText().length === 0) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
		return;
	}

	let yamlDocument = parseYAML(textDocument.getText(), customTags);
	customLanguageService.doValidation(textDocument, yamlDocument).then(
		function(diagnosticResults) {
			let diagnostics = [];
			for (let diagnosticItem in diagnosticResults) {
				diagnosticResults[diagnosticItem].severity = 1; //Convert all warnings to errors
				diagnostics.push(diagnosticResults[diagnosticItem]);
			}

			connection.sendDiagnostics({
				uri: textDocument.uri,
				diagnostics: removeDuplicatesObj(diagnostics)
			});
		},
		function(error) {}
	);
}

connection.onDidChangeWatchedFiles(change => {
	// Monitored files have changed in VSCode
	let hasChanges = false;
	change.changes.forEach(c => {
		if (customLanguageService.resetSchema(c.uri)) {
			hasChanges = true;
		}
	});
	if (hasChanges) {
		documents.all().forEach(validateTextDocument);
	}
});

connection.onCompletion(textDocumentPosition => {
	let textDocument = documents.get(textDocumentPosition.textDocument.uri);

	let result: CompletionList = {
		items: [],
		isIncomplete: false
	};

	if (!textDocument) {
		return Promise.resolve(result);
	}

	let completionFix = completionHelper(
		textDocument,
		textDocumentPosition.position
	);
	let newText = completionFix.newText;
	let jsonDocument = parseYAML(newText);
	return customLanguageService.doComplete(
		textDocument,
		textDocumentPosition.position,
		jsonDocument
	);
});

function is_EOL(c) {
	return c === 0x0a /* LF */ || c === 0x0d /* CR */;
}

function completionHelper(
	document: TextDocument,
	textDocumentPosition: Position
) {
	//Get the string we are looking at via a substring
	let linePos = textDocumentPosition.line;
	let position = textDocumentPosition;
	let lineOffset = getLineOffsets(document.getText());
	let start = lineOffset[linePos]; //Start of where the autocompletion is happening
	let end = 0; //End of where the autocompletion is happening
	if (lineOffset[linePos + 1]) {
		end = lineOffset[linePos + 1];
	} else {
		end = document.getText().length;
	}

	while (end - 1 >= 0 && is_EOL(document.getText().charCodeAt(end - 1))) {
		end--;
	}

	let textLine = document.getText().substring(start, end);

	//Check if the string we are looking at is a node
	if (textLine.indexOf(':') === -1) {
		//We need to add the ":" to load the nodes

		let newText = '';

		//This is for the empty line case
		let trimmedText = textLine.trim();
		if (
			trimmedText.length === 0 ||
			(trimmedText.length === 1 && trimmedText[0] === '-')
		) {
			//Add a temp node that is in the document but we don't use at all.
			newText =
				document.getText().substring(0, start + textLine.length) +
				(trimmedText[0] === '-' && !textLine.endsWith(' ') ? ' ' : '') +
				'holder:\r\n' +
				document
					.getText()
					.substr(
						lineOffset[linePos + 1] || document.getText().length
					);

			//For when missing semi colon case
		} else {
			//Add a semicolon to the end of the current line so we can validate the node
			newText =
				document.getText().substring(0, start + textLine.length) +
				':\r\n' +
				document
					.getText()
					.substr(
						lineOffset[linePos + 1] || document.getText().length
					);
		}

		return {
			newText: newText,
			newPosition: textDocumentPosition
		};
	} else {
		//All the nodes are loaded
		position.character = position.character - 1;
		return {
			newText: document.getText(),
			newPosition: position
		};
	}
}

connection.onCompletionResolve(completionItem => {
	return customLanguageService.doResolve(completionItem);
});

connection.onHover(textDocumentPositionParams => {
	let document = documents.get(textDocumentPositionParams.textDocument.uri);

	if (!document) {
		return Promise.resolve(void 0);
	}

	let jsonDocument = parseYAML(document.getText());
	return customLanguageService.doHover(
		document,
		textDocumentPositionParams.position,
		jsonDocument
	);
});

connection.onDocumentSymbol(documentSymbolParams => {
	let document = documents.get(documentSymbolParams.textDocument.uri);

	if (!document) {
		return;
	}

	let jsonDocument = parseYAML(document.getText());
	return customLanguageService.findDocumentSymbols(document, jsonDocument);
});

connection.listen();
