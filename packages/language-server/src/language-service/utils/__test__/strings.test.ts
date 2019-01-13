import { startsWith, endsWith, convertSimple2RegExp } from "../strings";

describe("startsWith", function() {
  it("String with different lengths", () => {
    let one = "hello";
    let other = "goodbye";

    var result = startsWith(one, other);
    expect(result).toBe(false);
  });

  it("String with same length different first letter", () => {
    let one = "hello";
    let other = "jello";

    var result = startsWith(one, other);
    expect(result).toBe(false);
  });

  it("Same string", () => {
    let one = "hello";
    let other = "hello";

    var result = startsWith(one, other);
    expect(result).toBe(true);
  });
});

describe("endsWith", function() {
  it("String with different lengths", () => {
    let one = "hello";
    let other = "goodbye";

    var result = endsWith(one, other);
    expect(result).toBe(false);
  });

  it("Strings that are the same", () => {
    let one = "hello";
    let other = "hello";

    var result = endsWith(one, other);
    expect(result).toBe(true);
  });

  it("Other is smaller then one", () => {
    let one = "hello";
    let other = "hi";

    var result = endsWith(one, other);
    expect(result).toBe(false);
  });
});

describe("convertSimple2RegExp", function() {
  it("Test of convertRegexString2RegExp", () => {
    var result = convertSimple2RegExp("/toc\\.yml/i").test("TOC.yml");
    expect(result).toBe(true);
  });

  it("Test of convertGlobalPattern2RegExp", () => {
    var result = convertSimple2RegExp("toc.yml").test("toc.yml");
    expect(result).toBe(true);

    result = convertSimple2RegExp("toc.yml").test("TOC.yml");
    expect(result).toBe(false);
  });
});
