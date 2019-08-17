"use strict"

export function insertionPointReturnValue(pt: number) {
	return -pt - 1
}

export function binarySearch(array: number[], sought: number) {
	let lower = 0
	let upper = array.length - 1

	while (lower <= upper) {
		const idx = Math.floor((lower + upper) / 2)
		const value = array[idx]

		if (value === sought) {
			return idx
		}

		if (lower === upper) {
			const insertionPoint = value < sought ? idx + 1 : idx
			return insertionPointReturnValue(insertionPoint)
		}

		if (sought > value) {
			lower = idx + 1
		} else if (sought < value) {
			upper = idx - 1
		}
	}
}
