import {
	getLineOffsets,
	removeDuplicates,
	removeDuplicatesObj
} from "../arrayUtils"

describe("Array Utils", () => {
	describe("removeDuplicates", () => {
		it("Remove one duplicate with property", () => {
			const obj1 = {
				test_key: "test_value"
			}

			const obj2 = {
				test_key: "test_value"
			}

			const arr = [obj1, obj2]
			const prop = "test_key"

			const result = removeDuplicates(arr, prop)
			expect(result).toHaveLength(1)
		})

		it("Remove multiple duplicates with property", () => {
			const obj1 = {
				test_key: "test_value"
			}

			const obj2 = {
				test_key: "test_value"
			}

			const obj3 = {
				test_key: "test_value"
			}

			const obj4 = {
				another_key_too: "test_value"
			}

			const arr = [obj1, obj2, obj3, obj4]
			const prop = "test_key"

			const result = removeDuplicates(arr, prop)
			expect(result).toHaveLength(2)
		})

		it("Do NOT remove items without duplication", () => {
			const obj1 = {
				first_key: "test_value"
			}

			const obj2 = {
				second_key: "test_value"
			}

			const arr = [obj1, obj2]
			const prop = "first_key"

			const result = removeDuplicates(arr, prop)
			expect(result).toHaveLength(2)
		})
	})

	describe("getLineOffsets", () => {
		it("No offset", () => {
			const offsets = getLineOffsets("")
			expect(offsets).toHaveLength(0)
		})

		it("One offset", () => {
			const offsets = getLineOffsets("test_offset")
			expect(offsets).toHaveLength(1)
			expect(offsets[0]).toBe(0)
		})

		it("One offset with \\r\\n", () => {
			const offsets = getLineOffsets("first_offset\r\n")
			expect(offsets).toHaveLength(2)
			expect(offsets[0]).toBe(0)
		})

		it("Multiple offsets", () => {
			const offsets = getLineOffsets(
				"first_offset\n  second_offset\n    third_offset"
			)
			expect(offsets).toHaveLength(3)
			expect(offsets[0]).toBe(0)
			expect(offsets[1]).toBe(13)
			expect(offsets[2]).toBe(29)
		})
	})

	describe("removeDuplicatesObj", () => {
		it("Remove one duplicate with property", () => {
			const obj1 = {
				test_key: "test_value"
			}

			const obj2 = {
				test_key: "test_value"
			}

			const arr = [obj1, obj2]
			const result = removeDuplicatesObj(arr)
			expect(result).toHaveLength(1)
		})

		it("Does not remove anything unneccessary", () => {
			const obj1 = {
				test_key: "test_value"
			}

			const obj2 = {
				other_key: "test_value"
			}

			const arr = [obj1, obj2]
			const prop = "test_key"

			const result = removeDuplicatesObj(arr)
			expect(result).toHaveLength(2)
		})
	})
})
