import * as path from "path"
import URI from "../uri"

describe("URI Parse", () => {
	it("Basic", () => {
		const result = URI.parse("http://www.foo.com/bar.html?name=hello#123")
		expect(result).toEqual(
			expect.objectContaining({
				authority: "www.foo.com",
				fragment: "123",
				fsPath: path.sep + "bar.html",
				path: "/bar.html",
				query: "name=hello",
				scheme: "http"
			})
		)
	})
})

describe("URI Create", () => {
	it("Basic", () => {
		const result = URI.create(
			"http",
			"www.foo.com",
			"/bar.html",
			"name=hello",
			"123"
		)
		expect(result).toEqual(
			expect.objectContaining({
				authority: "www.foo.com",
				fragment: "123",
				fsPath: path.sep + "bar.html",
				path: "/bar.html",
				query: "name=hello",
				scheme: "http"
			})
		)
	})
})

describe("URI File", () => {
	it("Basic", () => {
		const result = URI.file("../uri.test.ts")

		expect(result).toEqual(
			expect.objectContaining({
				fragment: "",
				fsPath: path.sep + ".." + path.sep + "uri.test.ts",
				path: "/../uri.test.ts",
				query: "",
				scheme: "file"
			})
		)
	})

	it("File with UNC share", () => {
		const result = URI.file("//server/share")

		expect(result).toEqual(
			expect.objectContaining({
				fragment: "",
				path: "/share",
				query: "",
				scheme: "file",
				authority: "server"
			})
		)
	})

	it("File with location", () => {
		const result = URI.file("//server")

		expect(result).toEqual(
			expect.objectContaining({
				fragment: "",
				path: "/",
				query: "",
				scheme: "file",
				authority: "server"
			})
		)
	})
})

describe("URI toString", () => {
	it("toString with encoding", () => {
		const result = URI.parse(
			"http://www.foo.com:8080/bar.html?name=hello#123"
		).toString()
		expect(result).toBe("http://www.foo.com:8080/bar.html?name%3Dhello#123")
	})

	it("toString without encoding", () => {
		const result = URI.parse(
			"http://www.foo.com/bar.html?name=hello#123"
		).toString(true)
		expect(result).toBe("http://www.foo.com/bar.html?name=hello#123")
	})

	it("toString with system file", () => {
		const result = URI.parse("file:///C:/test.txt").toString(true)
		expect(result).toBe("file:///c:/test.txt")
	})
})

describe("URI toJson", () => {
	it("toJson with system file", () => {
		const result = URI.parse("file:///C:/test.txt").toJSON()

		expect(result).toEqual(
			expect.objectContaining({
				authority: "",
				external: "file:///c%3A/test.txt",
				fragment: "",
				fsPath: "c:" + path.sep + "test.txt",
				path: "/C:/test.txt",
				query: "",
				scheme: "file"
			})
		)
	})
})
