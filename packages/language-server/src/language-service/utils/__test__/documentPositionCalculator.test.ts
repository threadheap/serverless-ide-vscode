import {
  binarySearch,
  getLineStartPositions,
  getPosition
} from "../documentPositionCalculator";

describe("binarySearch", function() {
  it("Binary Search where we are looking for element to the left of center", () => {
    let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let find = 2;

    var result = binarySearch(arr, find);
    expect(result).toBe(1);
  });

  it("Binary Search where we are looking for element to the right of center", () => {
    let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let find = 8;

    var result = binarySearch(arr, find);
    expect(result).toBe(7);
  });

  it("Binary Search found at first check", () => {
    let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let find = 5;

    var result = binarySearch(arr, find);
    expect(result).toBe(4);
  });

  it("Binary Search item not found", () => {
    let arr = [1];
    let find = 5;

    var result = binarySearch(arr, find);
    expect(result).toBe(-2);
  });
});

describe("getLineStartPositions", function() {
  it("getLineStartPositions with windows newline", () => {
    let test_str = "test: test\r\ntest: test";

    var result = getLineStartPositions(test_str);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(12);
  });

  it("getLineStartPositions with normal newline", () => {
    let test_str = "test: test\ntest: test";

    var result = getLineStartPositions(test_str);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(11);
  });
});

describe("getPosition", function() {
  it("getPosition", () => {
    let test_str = "test: test\r\ntest: test";

    var startPositions = getLineStartPositions(test_str);
    var result = getPosition(0, startPositions);
    expect(result).toBeDefined();
    expect(result.line).toBe(0);
    expect(result.column).toBe(0);
  });

  it("getPosition when not found", () => {
    let test_str = "test: test\ntest: test";

    var startPositions = getLineStartPositions(test_str);
    var result = getPosition(5, startPositions);
    expect(result).toBeDefined();
    expect(result.line).toBe(0);
    expect(result.column).toBe(5);
  });
});
