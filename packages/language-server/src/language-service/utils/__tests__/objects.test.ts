import { equals } from "../objects"

describe("Object Equals Tests", () => {
	it("Both are null", () => {
		const one = null
		const other = null

		const result = equals(one, other)
		expect(result).toBe(true)
	})

	it("One is null the other is true", () => {
		const one = null
		const other = true

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("One is string the other is boolean", () => {
		const one = "test"
		const other = false

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("One is not object", () => {
		const one = "test"
		const other = false

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("One is array the other is not", () => {
		const one = new Proxy([], {})
		const other = Object.keys({
			1: "2",
			2: "3"
		})
		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("Both are arrays of different length", () => {
		const one = [1, 2, 3]
		const other = [1, 2, 3, 4]

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("Both are arrays of same elements but in different order", () => {
		const one = [1, 2, 3]
		const other = [3, 2, 1]

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("Arrays that are equal", () => {
		const one = [1, 2, 3]
		const other = [1, 2, 3]

		const result = equals(one, other)
		expect(result).toBe(true)
	})

	it("Objects that are equal", () => {
		const one = {
			test: 1
		}
		const other = {
			test: 1
		}

		const result = equals(one, other)
		expect(result).toBe(true)
	})

	it("Objects that have same keys but different values", () => {
		const one = {
			test: 1
		}
		const other = {
			test: 5
		}

		const result = equals(one, other)
		expect(result).toBe(false)
	})

	it("Objects that have different keys", () => {
		const one = {
			testOne: 1
		}
		const other = {
			testOther: 1
		}

		const result = equals(one, other)
		expect(result).toBe(false)
	})
})
