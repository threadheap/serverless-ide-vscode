import { parse as parseYaml } from ".."
import { collectResources } from "./../resources"

const singleResource = `
Resources:
    Table:
        Type: AWS::DynamoDB::Table
`

const multipleResources = `
Resources:
    Function:
        Type: AWS::Serverless::Function 
    Table:
        Type: AWS::DynamoDB::Table
`

const invalidResource = `
Resources:
    Function:
        - type: fuuu
`

const duplicatedResources = `
Resources:
    Function:
        Type: AWS::Custom
    Function:
        Type: AWS::Function
`

const duplicatedResourcesWithInvalidType = `
Resources:
    Function:
        Type: blah
    Function:
        Type: AWS::Function
`

test("should collect resources from empty doc", () => {
	const doc = parseYaml(`
    `)

	const result = collectResources(doc.documents[0].root)

	expect(result.serialize()).toEqual({
		sequence: [],
		hash: {}
	})
})

test("should collect resources for document with single resource", () => {
	const doc = parseYaml(singleResource)
	const result = collectResources(doc.documents[0].root)

	expect(result).toEqual({
		sequence: ["Table"],
		hash: {
			Table: {
				id: "Table",
				resourceType: "AWS::DynamoDB::Table"
			}
		}
	})
})

test("should multiple resources", () => {
	const doc = parseYaml(multipleResources)
	const result = collectResources(doc.documents[0].root)

	expect(result).toEqual({
		sequence: ["Function", "Table"],
		hash: {
			Function: {
				id: "Function",
				resourceType: "AWS::Serverless::Function"
			},
			Table: {
				id: "Table",
				resourceType: "AWS::DynamoDB::Table"
			}
		}
	})
})

test("should invalid resources", () => {
	const doc = parseYaml(invalidResource)
	const result = collectResources(doc.documents[0].root)

	expect(result).toEqual({
		sequence: ["Function"],
		hash: {
			Function: {
				id: "Function",
				resourceType: undefined
			}
		}
	})
})

test("should collect duplicated resources", () => {
	const doc = parseYaml(duplicatedResources)
	const result = collectResources(doc.documents[0].root)

	expect(result).toEqual({
		sequence: ["Function"],
		hash: {
			Function: {
				id: "Function",
				resourceType: "AWS::Custom"
			}
		}
	})
})

test("should override invalid resource", () => {
	const doc = parseYaml(duplicatedResourcesWithInvalidType)
	const result = collectResources(doc.documents[0].root)

	expect(result).toEqual({
		sequence: ["Function"],
		hash: {
			Function: {
				id: "Function",
				resourceType: "AWS::Function"
			}
		}
	})
})
