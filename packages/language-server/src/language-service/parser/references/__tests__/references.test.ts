import { collectReferences } from "./../index"
import { parse as parseYaml } from "../.."
import { ReferenceType } from "../../../model/references"

describe("references collector", () => {
	const generateNode = (text: string) => {
		return parseYaml(text).documents[0].root
	}

	describe("ref", () => {
		test("should collect simple references", () => {
			const text = "Name: !Ref logicalName"
			const root = generateNode(text)

			const references = collectReferences(root)

			expect(references).toHaveLength(1)
			expect(references).toEqual([
				{
					type: ReferenceType.REF,
					key: "logicalName",
					node: expect.any(Object),
					offset: expect.any(Number)
				}
			])
		})
	})

	describe("sub", () => {
		test("should collect simple subs", () => {
			const text = "Name: !Sub some-text-${logicalName}-other-text"
			const root = generateNode(text)

			const references = collectReferences(root)

			expect(references).toHaveLength(1)
			expect(references).toEqual([
				{
					type: ReferenceType.SUB,
					key: "logicalName",
					node: expect.any(Object),
					offset: expect.any(Number)
				}
			])
		})

		test("should collect references from parameters", () => {
			const text = [
				"Name: !Sub",
				" - www.${Domain}",
				" - {Domain: !Ref logicalName}"
			].join("\n")

			const root = generateNode(text)

			const references = collectReferences(root)

			expect(references).toHaveLength(1)
			expect(references).toEqual([
				{
					type: ReferenceType.REF,
					key: "logicalName",
					node: expect.any(Object),
					offset: expect.any(Number)
				}
			])
		})

		test("should collect multiple references", () => {
			const text =
				"Name: !Sub some-text-${logicalName1}-other-${logicalName2}-text"
			const root = generateNode(text)

			const references = collectReferences(root)

			expect(references).toHaveLength(2)
			expect(references[0]).toEqual({
				type: ReferenceType.SUB,
				key: "logicalName1",
				node: expect.any(Object),
				offset: expect.any(Number)
			})
			expect(references[1]).toEqual({
				type: ReferenceType.SUB,
				key: "logicalName2",
				node: expect.any(Object),
				offset: expect.any(Number)
			})
		})
	})

	describe("conditions", () => {
		test("should collect references from conditions", () => {
			const text = [
				"Name: !And",
				' - !Equals ["some-test", !Ref logicalName1]',
				" - !Not [!Ref logicalName2]"
			].join("\n")
			const root = generateNode(text)

			const references = collectReferences(root)

			expect(references).toHaveLength(2)
			expect(references).toEqual([
				{
					type: ReferenceType.REF,
					key: "logicalName1",
					node: expect.any(Object),
					offset: expect.any(Number)
				},
				{
					type: ReferenceType.REF,
					key: "logicalName2",
					node: expect.any(Object),
					offset: expect.any(Number)
				}
			])
		})
	})
})
