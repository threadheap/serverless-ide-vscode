import {
  removeDuplicates,
  getLineOffsets,
  removeDuplicatesObj
} from "../arrayUtils";

describe("Array Utils", function() {
  describe("removeDuplicates", function() {
    it("Remove one duplicate with property", () => {
      var obj1 = {
        test_key: "test_value"
      };

      var obj2 = {
        test_key: "test_value"
      };

      var arr = [obj1, obj2];
      var prop = "test_key";

      var result = removeDuplicates(arr, prop);
      expect(result).toHaveLength(1);
    });

    it("Remove multiple duplicates with property", () => {
      var obj1 = {
        test_key: "test_value"
      };

      var obj2 = {
        test_key: "test_value"
      };

      var obj3 = {
        test_key: "test_value"
      };

      var obj4 = {
        another_key_too: "test_value"
      };

      var arr = [obj1, obj2, obj3, obj4];
      var prop = "test_key";

      var result = removeDuplicates(arr, prop);
      expect(result).toHaveLength(2);
    });

    it("Do NOT remove items without duplication", () => {
      var obj1 = {
        first_key: "test_value"
      };

      var obj2 = {
        second_key: "test_value"
      };

      var arr = [obj1, obj2];
      var prop = "first_key";

      var result = removeDuplicates(arr, prop);
      expect(result).toHaveLength(2);
    });
  });

  describe("getLineOffsets", function() {
    it("No offset", () => {
      var offsets = getLineOffsets("");
      expect(offsets).toHaveLength(0);
    });

    it("One offset", () => {
      var offsets = getLineOffsets("test_offset");
      expect(offsets).toHaveLength(1);
      expect(offsets[0]).toBe(0);
    });

    it("One offset with \\r\\n", () => {
      var offsets = getLineOffsets("first_offset\r\n");
      expect(offsets).toHaveLength(2);
      expect(offsets[0]).toBe(0);
    });

    it("Multiple offsets", () => {
      var offsets = getLineOffsets(
        "first_offset\n  second_offset\n    third_offset"
      );
      expect(offsets).toHaveLength(3);
      expect(offsets[0]).toBe(0);
      expect(offsets[1]).toBe(13);
      expect(offsets[2]).toBe(29);
    });
  });

  describe("removeDuplicatesObj", function() {
    it("Remove one duplicate with property", () => {
      var obj1 = {
        test_key: "test_value"
      };

      var obj2 = {
        test_key: "test_value"
      };

      var arr = [obj1, obj2];
      var result = removeDuplicatesObj(arr);
      expect(result).toHaveLength(1);
    });

    it("Does not remove anything unneccessary", () => {
      var obj1 = {
        test_key: "test_value"
      };

      var obj2 = {
        other_key: "test_value"
      };

      var arr = [obj1, obj2];
      var prop = "test_key";

      var result = removeDuplicatesObj(arr);
      expect(result).toHaveLength(2);
    });
  });
});
