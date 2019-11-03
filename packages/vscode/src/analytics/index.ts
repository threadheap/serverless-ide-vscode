import * as Sentry from "@sentry/node"
import * as crypto from "crypto"
import { machineIdSync } from "node-machine-id"
import { userInfo } from "os"
import { AnalyticsReporter, IAnalyticsClient } from "vscode-extension-analytics"
import { Event as AnalyticsEvent, Exception } from "vscode-extension-analytics"

import * as packageJson from "../../package.json"
import { AmplitudeClient, AmplitudeEventData } from "./amplitude"
export { AnalyticsEvent, Exception }

class AnalyticsClient implements IAnalyticsClient {
	private amplitudeInstance: AmplitudeClient
	private deviceId: string
	private sessionId: number
	private userId: string

	constructor(apiKey: string) {
		const user = userInfo({ encoding: "utf8" })
		this.amplitudeInstance = new AmplitudeClient(apiKey)
		this.deviceId = machineIdSync()
		this.userId = crypto
			.createHash("md5")
			.update(user.username)
			.digest("hex")
		this.sessionId = Date.now()
	}

	initialise() {
		Sentry.init({
			dsn: "https://710778be7bd847558250574eb19e52e9@sentry.io/1509685",
			integrations: function(integrations) {
				return integrations.filter(integration => {
					return (
						integration.name !== "OnUncaughtException" &&
						integration.name !== "OnUnhandledRejection"
					)
				})
			},
			release: `${packageJson.name}@${packageJson.version}`
		})

		Sentry.configureScope(scope => {
			scope.setUser({
				id: this.userId
			})

			scope.setTags({
				deviceId: this.deviceId,
				sessionId: this.sessionId.toString()
			})
		})
	}

	async flush(): Promise<void> {
		await this.amplitudeInstance.dispose()
	}

	async sendEvent(event: AnalyticsEvent) {
		/* eslint-disable @typescript-eslint/camelcase */
		const amplitudeEvent: AmplitudeEventData = {
			event_type: event.action,
			user_id: this.userId,
			device_id: this.deviceId,
			session_id: this.sessionId,
			event_properties: event.toJSON()
		}
		/* eslint-enable @typescript-eslint/camelcase */

		await this.amplitudeInstance.track(amplitudeEvent)
	}

	async sendException(event: Exception) {
		await Sentry.captureException(event.error)
	}
}

export const createReporter = (
	extensionId: string,
	extensionVersion: string,
	apiKey: string
): AnalyticsReporter => {
	const client = new AnalyticsClient(apiKey)

	return new AnalyticsReporter(extensionId, extensionVersion, client, {
		configId: "serverlessIDE.telemetry",
		configEnabledId: "enableTelemetry"
	})
}
