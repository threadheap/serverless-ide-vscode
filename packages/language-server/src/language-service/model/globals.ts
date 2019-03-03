import { Segment } from "vscode-json-languageservice"

export const API: "Api" = "Api"
export const FUNCTION: "Function" = "Function"
export const SIMPLE_TABLE: "SimpleTable" = "SimpleTable"

export type GlobalKeyType = typeof API | typeof FUNCTION | typeof SIMPLE_TABLE

export const GlobalKeys = {
	[API]: {
		resourceType: "AWS::Serverless::Api"
	},
	[FUNCTION]: {
		resourceType: "AWS::Serverless::Function"
	},
	[SIMPLE_TABLE]: {
		resourceType: "AWS::Serverless::SimpleTable"
	}
}

export interface GlobalConfigItem {
	resourceType: string
	properties: Segment[]
}

export interface GlobalsConfig {
	[API]: GlobalConfigItem
	[FUNCTION]: GlobalConfigItem
	[SIMPLE_TABLE]: GlobalConfigItem
}

const KEYS = [API, FUNCTION, SIMPLE_TABLE]

export const isEmpty = (globalsConfig: GlobalsConfig): boolean => {
	return KEYS.every(key => globalsConfig[key].properties.length === 0)
}
