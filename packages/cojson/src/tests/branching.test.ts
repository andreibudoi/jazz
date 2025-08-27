import { describe, expect, test } from "vitest";
import { createTestNode } from "./testUtils.js";
import { expectMap } from "../coValue.js";

describe("Branching Logic", () => {
  describe("Branch Operations with Transactions", () => {
    test("should maintain separate transaction histories", async () => {
      const node = createTestNode();
      const group = node.createGroup();
      const originalMap = group.createMap();
      const branchName = "feature-branch";

      // Add transactions to original map
      originalMap.set("originalKey1", "value1", "trusting");
      originalMap.set("originalKey2", "value2", "trusting");

      const branch = expectMap(
        originalMap.core.createBranch(branchName, group.id).getCurrentContent(),
      );

      // Add transactions to branch
      branch.set("branchKey1", "branchValue1", "trusting");
      branch.set("branchKey2", "branchValue2", "trusting");

      expect(originalMap.get("branchKey1")).toBe(undefined);
      expect(originalMap.get("branchKey2")).toBe(undefined);
      expect(branch.get("branchKey2")).toBe("branchValue2");
      expect(branch.get("branchKey1")).toBe("branchValue1");
      expect(branch.get("originalKey1")).toBe("value1");
      expect(branch.get("originalKey2")).toBe("value2");
    });
  });

  describe("Branch Merging", () => {
    test("should merge branch transactions back to source", () => {
      const node = createTestNode();
      const group = node.createGroup();
      const originalMap = group.createMap();
      const branchName = "feature-branch";

      // Add transactions to original map
      originalMap.set("key1", "value1", "trusting");
      originalMap.set("key2", "value2", "trusting");

      // Create branch
      const branch = expectMap(
        originalMap.core.createBranch(branchName, group.id).getCurrentContent(),
      );

      // Add transactions to branch
      branch.set("key1", "branchValue1", "trusting");

      // Merge branch
      const result = expectMap(branch.core.mergeBranch().getCurrentContent());

      // Check that source now has branch transactions
      expect(result.get("key1")).toBe("branchValue1");
      expect(result.get("key2")).toBe("value2");
    });

    test("should not merge branch transactions back to source if they are already merged", () => {
      const node = createTestNode();
      const group = node.createGroup();
      const originalMap = group.createMap();
      const branchName = "feature-branch";

      // Add transactions to original map
      originalMap.set("key1", "value1", "trusting");
      originalMap.set("key2", "value2", "trusting");

      // Create branch
      const branch = expectMap(
        originalMap.core.createBranch(branchName, group.id).getCurrentContent(),
      );

      // Add transactions to branch
      branch.set("key1", "branchValue1", "trusting");

      // Merge branch twice
      expectMap(branch.core.mergeBranch().getCurrentContent());
      const result = expectMap(branch.core.mergeBranch().getCurrentContent());

      expect(result.core.mergeCommits.length).toBe(1);

      // Check that source now has branch transactions
      expect(result.get("key1")).toBe("branchValue1");
      expect(result.get("key2")).toBe("value2");
    });

    test("should not create a merge commit if the branch is empty", () => {
      const node = createTestNode();
      const group = node.createGroup();
      const originalMap = group.createMap();
      const branchName = "feature-branch";

      // Add transactions to original map
      originalMap.set("key1", "value1", "trusting");
      originalMap.set("key2", "value2", "trusting");

      // Create branch
      const branch = expectMap(
        originalMap.core.createBranch(branchName, group.id).getCurrentContent(),
      );

      // Merge branch twice
      const result = expectMap(branch.core.mergeBranch().getCurrentContent());

      expect(result.core.mergeCommits.length).toBe(0);
    });

    test("should merge the new changes from the branch after the last merge", () => {
      const node = createTestNode();
      const group = node.createGroup();
      const originalMap = group.createMap();
      const branchName = "feature-branch";

      originalMap.set("key1", "value1", "trusting");
      originalMap.set("key2", "value2", "trusting");

      const branch = expectMap(
        originalMap.core.createBranch(branchName, group.id).getCurrentContent(),
      );

      branch.set("key1", "branchValue1", "trusting");

      branch.core.mergeBranch();

      expect(originalMap.get("key1")).toBe("branchValue1");
      expect(originalMap.get("key2")).toBe("value2");

      branch.set("key2", "branchValue2", "trusting");

      branch.core.mergeBranch();

      expect(originalMap.core.mergeCommits.length).toBe(2);

      expect(originalMap.get("key1")).toBe("branchValue1");
      expect(originalMap.get("key2")).toBe("branchValue2");
    });
  });
});
