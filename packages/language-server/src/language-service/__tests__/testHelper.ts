import {
	IPCMessageReader,
	IPCMessageWriter,
	createConnection,
	IConnection,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver';
import * as URL from 'url';

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
connection.onInitialize(
	(params): InitializeResult => {
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
