import TelemetryReporter from "vscode-extension-telemetry"

class Telemetry {
	extensionId: string
	extensionVersion: string
	private telemetryReporter: TelemetryReporter

	get reporter(): TelemetryReporter {
		return this.telemetryReporter
	}

	constructor(
		extensionId: string,
		extensionVersion: string,
		instrumentationKey: string
	) {
		this.extensionId = extensionId
		this.extensionVersion = extensionVersion
		this.telemetryReporter = new TelemetryReporter(
			extensionId,
			extensionVersion,
			instrumentationKey
		)
	}

	async sendServerEvent(
		name: string,
		stringData: { [key: string]: string } = {},
		numericData: { [key: string]: number } = {}
	): Promise<void> {
		await this.reporter.sendTelemetryEvent(
			name,
			{
				...stringData,
				version: this.extensionVersion
			},
			numericData
		)
	}
}

export const createReporter = (
	extensionId: string,
	extensionVersion: string,
	instrumentationKey: string
): Telemetry => {
	return new Telemetry(extensionId, extensionVersion, instrumentationKey)
}
