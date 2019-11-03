import { TextDocument } from "vscode-languageserver"

import { parse as parseYaml } from ".."
import { CUSTOM_TAGS, TagKind } from "./../../model/custom-tags"

const optionsMapping: { [key in TagKind]: string } = {
	scalar: "logicVariable",
	sequence: ["", "   - logicalVariable1", "   - logicalVariable2"].join("\n"),
	mapping: "{ val1: logicalVariable1, val2: logicalVariable2 }"
}

describe("custom tags parse", () => {
	describe("smoke tests", () => {
		const generateNode = (text: string) => {
			const document = TextDocument.create("", "", 1, text)
			return parseYaml(document).root
		}

		CUSTOM_TAGS.forEach(tag => {
			describe(tag.type, () => {
				if (tag.type) {
					test(`${tag.type}`, () => {
						const text = [
							`property: ${tag.tag} `,
							optionsMapping[tag.kind]
						].join("")
						const node = generateNode(text)

						expect(node).toMatchSnapshot()
					})
				}
			})
		})
	})
})
