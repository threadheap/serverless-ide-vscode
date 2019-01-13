import URI from "../uri";
var path = require("path");

describe("URI Parse", function() {
  it("Basic", () => {
    var result = URI.parse("http://www.foo.com/bar.html?name=hello#123");
    expect(result).toEqual(
      expect.objectContaining({
        authority: "www.foo.com",
        fragment: "123",
        fsPath: path.sep + "bar.html",
        path: "/bar.html",
        query: "name=hello",
        scheme: "http"
      })
    );
  });
});

describe("URI Create", function() {
  it("Basic", () => {
    var result = URI.create(
      "http",
      "www.foo.com",
      "/bar.html",
      "name=hello",
      "123"
    );
    expect(result).toEqual(
      expect.objectContaining({
        authority: "www.foo.com",
        fragment: "123",
        fsPath: path.sep + "bar.html",
        path: "/bar.html",
        query: "name=hello",
        scheme: "http"
      })
    );
  });
});

describe("URI File", function() {
  it("Basic", () => {
    var result = URI.file("../uri.test.ts");

    expect(result).toEqual(
      expect.objectContaining({
        fragment: "",
        fsPath: path.sep + ".." + path.sep + "uri.test.ts",
        path: "/../uri.test.ts",
        query: "",
        scheme: "file"
      })
    );
  });

  it("File with UNC share", () => {
    var result = URI.file("//server/share");

    expect(result).toEqual(
      expect.objectContaining({
        fragment: "",
        path: "/share",
        query: "",
        scheme: "file",
        authority: "server"
      })
    );
  });

  it("File with location", () => {
    var result = URI.file("//server");

    expect(result).toEqual(
      expect.objectContaining({
        fragment: "",
        path: "/",
        query: "",
        scheme: "file",
        authority: "server"
      })
    );
  });
});

describe("URI toString", function() {
  it("toString with encoding", () => {
    var result = URI.parse(
      "http://www.foo.com:8080/bar.html?name=hello#123"
    ).toString();
    expect(result).toBe("http://www.foo.com:8080/bar.html?name%3Dhello#123");
  });

  it("toString without encoding", () => {
    var result = URI.parse(
      "http://www.foo.com/bar.html?name=hello#123"
    ).toString(true);
    expect(result).toBe("http://www.foo.com/bar.html?name=hello#123");
  });

  it("toString with system file", () => {
    var result = URI.parse("file:///C:/test.txt").toString(true);
    expect(result).toBe("file:///c:/test.txt");
  });
});

describe("URI toJson", function() {
  it("toJson with system file", () => {
    var result = URI.parse("file:///C:/test.txt").toJSON();

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
    );
  });
});
