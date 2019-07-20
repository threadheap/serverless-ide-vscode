import { IConnection } from "vscode-languageserver"

export interface AnalyticsPayload {
	action: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	attributes: { [key: string]: any }
}

export interface ExceptionPayload {
	message: string
	stack: string
}

let connection: IConnection = void 0

export const initializeAnalytics = (serverConnection: IConnection) => {
	connection = serverConnection
}

export const sendAnalytics = (payload: AnalyticsPayload) => {
	if (connection) {
		connection.sendNotification("custom/analytics", payload)
	}
}

export const sendException = (error: Error, message: string = "") => {
	if (connection) {
		connection.sendNotification("custom/analytics", {
			message: `${message}: ${error.message}`,
			stack: error.stack
		})
	}
}
