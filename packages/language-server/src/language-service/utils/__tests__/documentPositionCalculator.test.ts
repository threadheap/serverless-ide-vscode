import { binarySearch } from "../documentPositionCalculator"

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
