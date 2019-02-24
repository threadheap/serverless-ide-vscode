/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
	IPCMessageReader,
	IPCMessageWriter,
	createConnection,
	IConnection,
	TextDocumentSyncKind,
	InitializeResult,
	RequestType
} from 'vscode-languageserver';
import { xhr, XHRResponse, getErrorStatusDescription } from 'request-light';
import Strings = require('../utils/strings');
import URI from '../utils/uri';
import * as URL from 'url';
import fs = require('fs');

namespace VSCodeContentRequest {
	export const type: RequestType<{}, {}, {}, {}> = new RequestType(
		'vscode/content'
	);
}

// Create a connection for the server.
let connection: IConnection = null;
if (process.argv.indexOf('--stdio') == -1) {
	connection = createConnection(
		new IPCMessageReader(process),
		new IPCMessageWriter(process)
	);
} else {
	connection = createConnection();
}

// After the server has started the client sends an initialize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilities.
let workspaceRoot: string;
connection.onInitialize(
	(params): InitializeResult => {
		workspaceRoot = params.rootPath;
		return {
			capabilities: {
				// Tell the client that the server works in FULL text document sync mode
				textDocumentSync: TextDocumentSyncKind.Full,
				// Tell the client that the server support code complete
				completionProvider: {
					resolveProvider: false
				}
			}
		};
	}
);

export let workspaceContext = {
	resolveRelativePath: (relativePath: string, resource: string) => {
		return URL.resolve(resource, relativePath);
	}
};
