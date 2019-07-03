export enum ValidationProvider {
	default = "default",
	"cfn-lint" = "cfn-lint"
}

export interface CFNLintExtensionSettings {
	path?: string
	appendRules?: string[]
	ignoreRules?: string[]
	overrideSpecPath?: string
}

export interface ExtensionSettings {
	serverlessIDE: {
		validationProvider?: ValidationProvider
		cfnLint?: CFNLintExtensionSettings
		validate?: boolean
		hover?: boolean
		completion?: boolean
	}
	http: {
		proxy: string
		proxyStrictSSL: boolean
	}
}

export interface CFNLintSettings {
	path: string
	appendRules: string[]
	ignoreRules: string[]
	overrideSpecPath?: string
}

export interface LanguageSettings {
	validate: boolean
	hover: boolean
	completion: boolean
	customTags: string[]
	validationProvider: ValidationProvider
	cfnLint: CFNLintSettings
	workspaceRoot: string
}

export const getDefaultLanguageSettings = (): LanguageSettings => ({
	validate: true,
	hover: true,
	completion: true,
	customTags: [],
	validationProvider: ValidationProvider["cfn-lint"],
	cfnLint: {
		path: "cfn-lint",
		appendRules: [],
		ignoreRules: []
	},
	workspaceRoot: ""
})
