module.exports = {
	roots: [
		"<rootDir>/packages/language-server",
		"<rootDir>/packages/vscode",
		"<rootDir>/packages/sam-schema",
		"<rootDir>/packages/config"
	],
	testMatch: ["**/__tests__/**/?(*.)+(spec|test).+(ts|js)"],
	modulePathIgnorePatterns: ["node_modules"],
	moduleNameMapper: {
		"@serverless-ide/(.*)$": "<rootDir>/packages/$1"
	},
	preset: "ts-jest",
	testEnvironment: "node",
	verbose: false
}
