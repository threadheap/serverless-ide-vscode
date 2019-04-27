export const CLOUD_FORMATION = "CLOUD_FORMATION"
export const SAM = "SAM"
export const SERVERLESS_FRAMEWORK = "SERVERLESS_FRAMEWORK"
export const UNKNOWN = "UNKNOWN"

export type DocumentType =
	| typeof CLOUD_FORMATION
	| typeof SAM
	| typeof SERVERLESS_FRAMEWORK
	| typeof UNKNOWN
