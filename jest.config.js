module.exports = {
	roots: [
		"<rootDir>/packages/language-server",
		"<rootDir>/packages/vscode",
		"<rootDir>/packages/sam-schema"
	],
	testMatch: ["**/__tests__/**/?(*.)+(spec|test).+(ts|js)"],
	modulePathIgnorePatterns: ["node_modules"],
	preset: "ts-jest",
	testEnvironment: "node"
}
