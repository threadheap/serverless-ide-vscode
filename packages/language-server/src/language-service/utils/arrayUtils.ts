import { forEach } from "lodash"
import toArray = require("lodash/toArray")
import { SingleYAMLDocument, YAMLDocument } from "../parser"

export function removeDuplicates(arr, prop) {
	const lookup = {}

	arr.forEach(item => {
		lookup[item[prop]] = item
	})

	return toArray(lookup)
}

export function getLineOffsets(textDocString: string): number[] {
	const lineOffsets: number[] = []
	const text = textDocString
	let isLineStart = true
	for (let i = 0; i < text.length; i++) {
		if (isLineStart) {
			lineOffsets.push(i)
			isLineStart = false
		}
		const ch = text.charAt(i)
		isLineStart = ch === "\r" || ch === "\n"
		if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") {
			i++
		}
	}
	if (isLineStart && text.length > 0) {
		lineOffsets.push(text.length)
	}

	return lineOffsets
}

export function removeDuplicatesObj(objArray) {
	const nonDuplicateSet = new Set()
	const nonDuplicateArr = []

	objArray.forEach(currObj => {
		const stringifiedObj = JSON.stringify(currObj)
		if (!nonDuplicateSet.has(stringifiedObj)) {
			nonDuplicateArr.push(currObj)
			nonDuplicateSet.add(stringifiedObj)
		}
	})

	return nonDuplicateArr
}

export function matchOffsetToDocument(
	offset: number,
	jsonDocuments: YAMLDocument
): SingleYAMLDocument | void {
	return jsonDocuments.documents.find(jsonDoc => {
		return (
			jsonDoc.root &&
			jsonDoc.root.end >= offset &&
			jsonDoc.root.start <= offset
		)
	})
}
