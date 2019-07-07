import { AmplitudeClient, AmplitudeEventData } from "./amplitude"
import { AnalyticsReporter, IAnalyticsClient } from "vscode-extension-analytics"
import { Event as AnalyticsEvent, Exception } from "vscode-extension-analytics"
import { machineIdSync } from "node-machine-id"
import { hostname } from "os"
import * as crypto from "crypto"
export { AnalyticsEvent, Exception }

class AnalyticsClient implements IAnalyticsClient {
	private instance: AmplitudeClient
	private deviceId: string
	private sessionId: number
	private userId: string

	constructor(apiKey: string) {
		this.instance = new AmplitudeClient(apiKey)
		this.deviceId = machineIdSync()
		this.userId = crypto
			.createHash("md5")
			.update(hostname())
			.digest("hex")
		this.sessionId = Date.now()
	}

	initialise() {}

	flush() {
		return Promise.resolve()
	}

	async sendEvent(event: AnalyticsEvent) {
		/* eslint-disable @typescript-eslint/camelcase */
		const amplitudeEvent: AmplitudeEventData = {
			event_type: "track",
			user_id: this.userId,
			device_id: this.deviceId,
			session_id: this.sessionId,
			event_properties: event.toJSON()
		}
		/* eslint-enable @typescript-eslint/camelcase */

		await this.instance.track(amplitudeEvent)
	}

	async sendException(event: Exception) {
		/* eslint-disable @typescript-eslint/camelcase */
		const amplitudeEvent: AmplitudeEventData = {
			event_type: "error",
			user_id: this.deviceId,
			session_id: this.sessionId,
			event_properties: event.toJSON()
		}
		/* eslint-enable @typescript-eslint/camelcase */

		await this.instance.track(amplitudeEvent)
	}
}

export const createReporter = (
	extensionId: string,
	extensionVersion: string,
	apiKey: string
): AnalyticsReporter => {
	const client = new AnalyticsClient(apiKey)

	return new AnalyticsReporter(extensionId, extensionVersion, client)
}
