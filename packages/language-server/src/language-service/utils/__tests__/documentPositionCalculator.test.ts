import {
	binarySearch,
	getLineStartPositions,
	getPosition
} from "../documentPositionCalculator"

describe("binarySearch", () => {
	it("Binary Search where we are looking for element to the left of center", () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		const find = 2

		const result = binarySearch(arr, find)
		expect(result).toBe(1)
	})

	it("Binary Search where we are looking for element to the right of center", () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		const find = 8

		const result = binarySearch(arr, find)
		expect(result).toBe(7)
	})

	it("Binary Search found at first check", () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		const find = 5

		const result = binarySearch(arr, find)
		expect(result).toBe(4)
	})

	it("Binary Search item not found", () => {
		const arr = [1]
		const find = 5

		const result = binarySearch(arr, find)
		expect(result).toBe(-2)
	})
})

describe("getLineStartPositions", () => {
	it("getLineStartPositions with windows newline", () => {
		const testStr = "test: test\r\ntest: test"

		const result = getLineStartPositions(testStr)
		expect(result[0]).toBe(0)
		expect(result[1]).toBe(12)
	})

	it("getLineStartPositions with normal newline", () => {
		const testStr = "test: test\ntest: test"

		const result = getLineStartPositions(testStr)
		expect(result[0]).toBe(0)
		expect(result[1]).toBe(11)
	})
})

describe("getPosition", () => {
	it("getPosition", () => {
		const testStr = "test: test\r\ntest: test"

		const startPositions = getLineStartPositions(testStr)
		const result = getPosition(0, startPositions)
		expect(result).toBeDefined()
		expect(result.line).toBe(0)
		expect(result.column).toBe(0)
	})

	it("getPosition when not found", () => {
		const testStr = "test: test\ntest: test"

		const startPositions = getLineStartPositions(testStr)
		const result = getPosition(5, startPositions)
		expect(result).toBeDefined()
		expect(result.line).toBe(0)
		expect(result.column).toBe(5)
	})
})
