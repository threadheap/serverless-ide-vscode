module.exports = {
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint"],
	extends: [
		"plugin:@typescript-eslint/recommended",
		"prettier/@typescript-eslint",
		"plugin:prettier/recommended"
	],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module"
	},
	rules: {
		"prettier/prettier": "error",
		"@typescript-eslint/explicit-member-accessibility": [
			2,
			{
				accessibility: "no-public"
			}
		],
		"@typescript-eslint/no-unused-vars": 2,
		"@typescript-eslint/indent": 0,
		"@typescript-eslint/interface-name-prefix": 2,
		"@typescript-eslint/no-explicit-any": 1,
		"@typescript-eslint/interface-name-prefix": 0,
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-use-before-define": "off"
	}
}
