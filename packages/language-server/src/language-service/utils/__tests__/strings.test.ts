import { convertSimple2RegExp, endsWith, startsWith } from "../strings"

describe("startsWith", () => {
	it("String with different lengths", () => {
		const one = "hello"
		const other = "goodbye"

		const result = startsWith(one, other)
		expect(result).toBe(false)
	})

	it("String with same length different first letter", () => {
		const one = "hello"
		const other = "jello"

		const result = startsWith(one, other)
		expect(result).toBe(false)
	})

	it("Same string", () => {
		const one = "hello"
		const other = "hello"

		const result = startsWith(one, other)
		expect(result).toBe(true)
	})
})

describe("endsWith", () => {
	it("String with different lengths", () => {
		const one = "hello"
		const other = "goodbye"

		const result = endsWith(one, other)
		expect(result).toBe(false)
	})

	it("Strings that are the same", () => {
		const one = "hello"
		const other = "hello"

		const result = endsWith(one, other)
		expect(result).toBe(true)
	})

	it("Other is smaller then one", () => {
		const one = "hello"
		const other = "hi"

		const result = endsWith(one, other)
		expect(result).toBe(false)
	})
})

describe("convertSimple2RegExp", () => {
	it("Test of convertRegexString2RegExp", () => {
		const result = convertSimple2RegExp("/toc\\.yml/i").test("TOC.yml")
		expect(result).toBe(true)
	})

	it("Test of convertGlobalPattern2RegExp", () => {
		let result = convertSimple2RegExp("toc.yml").test("toc.yml")
		expect(result).toBe(true)

		result = convertSimple2RegExp("toc.yml").test("TOC.yml")
		expect(result).toBe(false)
	})
})
