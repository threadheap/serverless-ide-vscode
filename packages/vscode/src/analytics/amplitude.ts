/* eslint-disable @typescript-eslint/camelcase */
import * as http from "http"
import * as https from "https"
import * as querystring from "querystring"
import { URL } from "url"

type LogLevel = "debug" | "info" | "warn" | "error"

export interface ClientOptions {
	appVersion?: string
	enabled?: boolean
	setTime?: boolean
	maxRetries?: number
	timeoutMs?: number
	endpoint?: string
	logging?: (level: LogLevel, message: string) => void
}

interface CommonEventProps {
	app_version?: string
	platform?: string
	os_name?: string
	os_version?: string
	device_brand?: string
	device_manufacturer?: string
	device_model?: string
	carrier?: string
	country?: string
	region?: string
	city?: string
	dma?: string
	language?: string
}

export interface SetProperties {
	$set?: {
		[key: string]: any
	}
	$unset?: {
		[key: string]: any
	}
	$setOnce?: {
		[key: string]: any
	}
	$append?: {
		[key: string]: any
	}
	$prepend?: {
		[key: string]: any
	}
	$add?: {
		[key: string]: any
	}
}

export interface ObjectProperties {
	[key: string]: any
}

export type UserProperties = SetProperties | ObjectProperties
export type GroupProperties = SetProperties | ObjectProperties

export interface Groups {
	[groupType: string]: string | string[]
}

// https://developers.amplitude.com/#keys-for-the-event-argument
export interface AmplitudeEventData<TEventNames = string>
	extends CommonEventProps {
	event_type: TEventNames
	user_id: string
	device_id?: string
	time?: number
	event_properties?: {
		[key: string]: any
	}
	user_properties?: UserProperties
	groups?: Groups
	price?: number
	quantity?: number
	revenue?: number
	productId?: string
	revenueType?: string
	location_lat?: number
	location_lng?: number
	ip?: string
	idfa?: string
	idfv?: string
	adid?: string
	android_id?: string

	event_id?: number
	session_id?: number
	insert_id?: string
}

// https://developers.amplitude.com/#request-format---idenify
interface CommonUserIdentification extends CommonEventProps {
	user_properties?: UserProperties
	groups?: Groups
	paying?: "true" | "false"
	start_version?: string
}

type UserIdIdentification = CommonUserIdentification & { user_id: string }
type UserDeviceIdentification = CommonUserIdentification & { device_id: string }
export type UserIdentification = UserIdIdentification | UserDeviceIdentification

interface AmplitudeResponse<T> {
	statusCode: number
	body: Buffer
	start: Date
	end: Date
	requestOptions: https.RequestOptions
	responseHeaders: http.IncomingHttpHeaders
	succeeded: boolean
	retryCount: number
	requestData: T
}

export class AmplitudeApiError<T> extends Error {
	readonly response: AmplitudeResponse<T>

	constructor(message: string, response: AmplitudeResponse<T>) {
		super(message)
		this.response = response
	}
}

interface ApiKeyData {
	api_key: string
}

export interface AmplitudeEventRequestData extends ApiKeyData {
	event: string
}

export interface AmplitudeGroupIdentifyRequestData extends ApiKeyData {
	identification: string
}

export interface AmplitudeIdentifyRequestData extends ApiKeyData {
	identification: string
}

export class AmplitudeClient<TEventNames = string> {
	private readonly apiKey: string
	private readonly enabled: boolean
	private readonly appVersion: string | null
	private readonly setTime: boolean
	private readonly maxRetries: number
	private readonly timeoutMs: number
	private readonly endpoint: string
	private readonly logging?: (level: LogLevel, message: string) => void

	constructor(apiKey: string, options: ClientOptions = {}) {
		options = options || {}
		this.apiKey = apiKey
		this.enabled = options.enabled !== false
		this.appVersion = options.appVersion || null
		this.setTime = options.setTime === true
		this.maxRetries = options.maxRetries || 2
		this.timeoutMs = options.timeoutMs || 5000
		this.endpoint = options.endpoint || "https://api.amplitude.com"
		this.logging = options.logging
	}

	async track(
		event: AmplitudeEventData<TEventNames>,
		reqOptions?: https.RequestOptions
	): Promise<AmplitudeResponse<AmplitudeEventRequestData>> {
		if (this.setTime) {
			event.time = Date.now()
		}
		if (this.appVersion) {
			event.app_version = this.appVersion
		}
		if (!event.insert_id) {
			event.insert_id =
				Date.now() +
				"_" +
				Math.random()
					.toString()
					.substring(2)
		}

		const formData: AmplitudeEventRequestData = {
			api_key: this.apiKey,
			event: JSON.stringify(event)
		}

		const options: http.RequestOptions = {
			method: "POST",
			path: "/httpapi",
			...reqOptions
		}

		return this.sendRequest(options, formData)
	}

	async identify(
		identify: UserIdentification,
		reqOptions?: https.RequestOptions
	): Promise<AmplitudeResponse<AmplitudeIdentifyRequestData>> {
		const formData: AmplitudeIdentifyRequestData = {
			api_key: this.apiKey,
			identification: JSON.stringify(identify)
		}

		const options: http.RequestOptions = {
			method: "POST",
			path: "/identify",
			...reqOptions
		}

		return this.sendRequest(options, formData)
	}

	async groupIdentify(
		groupType: string,
		groupValue: string,
		groupProps: GroupProperties,
		reqOptions?: https.RequestOptions
	): Promise<AmplitudeResponse<AmplitudeGroupIdentifyRequestData>> {
		const formData: AmplitudeGroupIdentifyRequestData = {
			api_key: this.apiKey,
			identification: JSON.stringify({
				group_type: groupType,
				group_value: groupValue,
				group_properties: groupProps
			})
		}

		const options: http.RequestOptions = {
			method: "POST",
			path: "/groupidentify",
			...reqOptions
		}

		return this.sendRequest(options, formData)
	}

	private async sendRequest<T>(
		options: https.RequestOptions,
		formData: any,
		retryCount = 0
	): Promise<AmplitudeResponse<T>> {
		const url = new URL(this.endpoint)
		options.protocol = url.protocol
		options.hostname = url.hostname
		options.port = url.port
		options.timeout = this.timeoutMs

		const postData = querystring.stringify(formData)
		const byteLength = Buffer.byteLength(postData)

		options.headers = options.headers || {}
		options.headers["Content-Type"] = "application/x-www-form-urlencoded"
		options.headers["Content-Length"] = byteLength

		if (!this.enabled) {
			return {
				body: Buffer.alloc(0),
				start: new Date(),
				end: new Date(),
				requestOptions: options,
				responseHeaders: {},
				statusCode: 0,
				succeeded: true,
				retryCount: 0,
				requestData: formData
			}
		}

		const apiUrl =
			`${options.protocol}//${options.hostname}` +
			`${options.port ? ":" + options.port : ""}${options.path}`

		const result = await new Promise<AmplitudeResponse<T>>(
			(resolve, reject) => {
				const start = new Date()

				try {
					const httpLib = options.protocol === "https:" ? https : http
					this.log(
						"debug",
						`sending request to Amplitude API ${apiUrl} (${byteLength} bytes)`
					)
					const req = httpLib.request(options, res => {
						res.on("error", reject)
						const chunks: Buffer[] = []
						res.on("data", (chunk: Buffer) => chunks.push(chunk))
						res.on("end", () => {
							resolve({
								start,
								end: new Date(),
								// should be "success" for successful requests
								// or some kind of message for failures (or HTML for 502s)
								body: Buffer.concat(chunks),
								requestOptions: options,
								responseHeaders: res.headers,
								statusCode: res.statusCode || 0,
								succeeded: res.statusCode === 200,
								retryCount,
								requestData: formData
							})
						})
					})

					req.on("error", reject)
					req.write(postData)
					req.end()
				} catch (e) {
					reject(e)
				}
			}
		)

		// https://developers.amplitude.com/#http-status-codes--amp--retrying-failed-requests
		const retryableStatusCodes = {
			500: true,
			502: true,
			503: true,
			504: true
		}

		const elapsed = result.end.getTime() - result.start.getTime()

		if (
			!retryableStatusCodes[result.statusCode] ||
			retryCount >= this.maxRetries
		) {
			if (result.succeeded) {
				this.log(
					"info",
					`successful Amplitude API call to ${apiUrl} ` +
						`after ${retryCount} retries (${elapsed}ms)`
				)
				return result
			}

			const message =
				`Amplitude API call to ${apiUrl} failed with ` +
				`status ${result.statusCode} after ${retryCount} retries` +
				`with message: ${result.body}`
			this.log("error", message + ` (${elapsed}ms)`)
			throw new AmplitudeApiError(message, result)
		}

		this.log(
			"warn",
			`retrying Amplitude request to ${apiUrl} ` +
				`(status code: ${result.statusCode}, retries: ${retryCount})`
		)
		return this.sendRequest(options, formData, retryCount + 1)
	}

	private log(level: LogLevel, message: string): void {
		if (!this.logging || typeof this.logging !== "function") {
			return
		}

		try {
			this.logging(level, message)
		} catch (e) {
			// ignore logging errors
		}
	}
}
