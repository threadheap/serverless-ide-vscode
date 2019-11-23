import { TextDocument } from "vscode-languageserver-types"

import { parse as parseYaml } from "../.."
import { ReferenceType } from "../../../model/references"
import { collectReferences } from "./../index"

describe("references collector", () => {
	const generateNode = (text: string) => {
		const document = TextDocument.create("", "", 1, text)
		return parseYaml(document).root
	}

	describe("short syntax", () => {
		describe("ref", () => {
			test("should collect simple references", () => {
				const text = "Name: !Ref logicalName"
				const root = generateNode(text)

				const references = collectReferences(root)

				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.REF,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})
		})

		describe("GetAtt", () => {
			test("should simple references", () => {
				const text = "Name: !GetAtt logicalName.Attribute"
				const root = generateNode(text)

				const references = collectReferences(root)

				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.GET_ATT,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})
		})

		describe("sub", () => {
			test("should collect simple subs", () => {
				const text = "Name: !Sub some-text-${logicalName}-other-text"
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.SUB,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect references from parameters", () => {
				const text = [
					"Name: !Sub",
					" - www.${Domain}",
					" - {Domain: !Ref logicalName}"
				].join("\n")

				const root = generateNode(text)

				const references = collectReferences(root)

				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.REF,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect multiple references", () => {
				const text =
					"Name: !Sub some-text-${logicalName1}-other-${logicalName2}-text"
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName1: [
						{
							type: ReferenceType.SUB,
							key: "logicalName1",
							node: expect.any(Object)
						}
					],
					logicalName2: [
						{
							type: ReferenceType.SUB,
							key: "logicalName2",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect multiple references with additional properties", () => {
				const text = [
					"Name: !Sub some-text-${logicalName1}-other-${logicalName2}-text",
					"AnotherProperty: value"
				].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName1: [
						{
							type: ReferenceType.SUB,
							key: "logicalName1",
							node: expect.any(Object)
						}
					],
					logicalName2: [
						{
							type: ReferenceType.SUB,
							key: "logicalName2",
							node: expect.any(Object)
						}
					]
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
				expect(references.hash).toEqual({
					logicalName1: [
						{
							type: ReferenceType.REF,
							key: "logicalName1",
							node: expect.any(Object)
						}
					],
					logicalName2: [
						{
							type: ReferenceType.REF,
							key: "logicalName2",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect references from conditions properties", () => {
				const text = ["Condition: MyCondition"].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					MyCondition: [
						{
							type: ReferenceType.CONDITION,
							key: "MyCondition",
							node: expect.any(Object)
						}
					]
				})
			})
		})
	})

	describe("full syntax", () => {
		describe("ref", () => {
			test("should collect simple references", () => {
				const text = ["Name:", "\tRef: logicalName"].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.REF,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})
		})

		describe("GetAtt", () => {
			test("should simple references", () => {
				const text = [
					"Name:",
					"  Fn::GetAtt: [ logicalName, Attribute ]"
				].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.GET_ATT,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})
		})

		describe("sub", () => {
			test("should collect simple subs", () => {
				const text = [
					"Name:",
					"\tFn::Sub: some-text-${logicalName}-other-text"
				].join("\n")

				const root = generateNode(text)

				const references = collectReferences(root)

				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.SUB,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect references from parameters", () => {
				const text = [
					"Name:",
					"  Fn::Sub:",
					"   - www.${Domain}",
					"   - {Domain: {Ref: logicalName}}"
				].join("\n")

				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName: [
						{
							type: ReferenceType.REF,
							key: "logicalName",
							node: expect.any(Object)
						}
					]
				})
			})

			test("should collect multiple references", () => {
				const text = [
					"Name:",
					"\tFn::Sub: some-text-${logicalName1}-other-${logicalName2}-text"
				].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName1: [
						{
							type: ReferenceType.SUB,
							key: "logicalName1",
							node: expect.any(Object)
						}
					],
					logicalName2: [
						{
							type: ReferenceType.SUB,
							key: "logicalName2",
							node: expect.any(Object)
						}
					]
				})
			})
		})

		describe("conditions", () => {
			test("should collect references from conditions", () => {
				const text = [
					"Name:",
					"  Fn::And:",
					'   - Fn::Equals: ["some-text", {Ref: logicalName1}]',
					"   - Fn::Not: [{Ref: logicalName2}]"
				].join("\n")
				const root = generateNode(text)

				const references = collectReferences(root)
				expect(references.hash).toEqual({
					logicalName1: [
						{
							type: ReferenceType.REF,
							key: "logicalName1",
							node: expect.any(Object)
						}
					],
					logicalName2: [
						{
							type: ReferenceType.REF,
							key: "logicalName2",
							node: expect.any(Object)
						}
					]
				})
			})
		})
	})

	describe("DependsOn", () => {
		test("should collect single depends on reference", () => {
			const text = ["Name:", "  DependsOn: logicalName"].join("\n")
			const root = generateNode(text)

			const references = collectReferences(root)
			expect(references.hash).toEqual({
				logicalName: [
					{
						type: ReferenceType.DEPENDS_ON,
						key: "logicalName",
						node: expect.any(Object)
					}
				]
			})
		})

		test("should collect multiple depends on references", () => {
			const text = [
				"Name:",
				"  DependsOn:",
				"   - logicalName1",
				"   - logicalName2"
			].join("\n")
			const root = generateNode(text)

			const references = collectReferences(root)
			expect(references.hash).toEqual({
				logicalName1: [
					{
						type: ReferenceType.DEPENDS_ON,
						key: "logicalName1",
						node: expect.any(Object)
					}
				],
				logicalName2: [
					{
						type: ReferenceType.DEPENDS_ON,
						key: "logicalName2",
						node: expect.any(Object)
					}
				]
			})
		})
	})
})
