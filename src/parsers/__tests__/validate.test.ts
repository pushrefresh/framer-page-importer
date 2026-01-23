/**
 * Unit tests for validation utilities
 */

import { describe, it, expect } from "vitest";
import {
  validateTree,
  validateSlugEdit,
  hasBlockingErrors,
  getValidationSummary,
} from "../validate";
import type { PageNode } from "../../types";

function createNode(
  overrides: Partial<PageNode> & { name: string; fullPath: string }
): PageNode {
  return {
    id: overrides.fullPath,
    slug: overrides.fullPath === "/" ? "/" : overrides.fullPath.split("/").pop() || "",
    pageType: "static",
    children: [],
    ...overrides,
  };
}

describe("validateTree", () => {
  it("should pass validation for a valid tree", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        children: [
          createNode({
            name: "About",
            fullPath: "/about",
            slug: "about",
            parentFullPath: "/",
          }),
        ],
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should detect duplicate fullPaths", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        children: [
          createNode({
            id: "1",
            name: "About",
            fullPath: "/about",
            slug: "about",
            parentFullPath: "/",
          }),
          createNode({
            id: "2",
            name: "About Page",
            fullPath: "/about", // Duplicate!
            slug: "about",
            parentFullPath: "/",
          }),
        ],
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "duplicate_fullpath")).toBe(true);
  });

  it("should detect empty names", () => {
    const tree: PageNode[] = [
      createNode({
        name: "",
        fullPath: "/",
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "empty_name")).toBe(true);
  });

  it("should detect empty slugs for non-root nodes", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        children: [
          createNode({
            name: "About",
            fullPath: "/about",
            slug: "", // Empty slug
            parentFullPath: "/",
          }),
        ],
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "empty_slug")).toBe(true);
  });

  it("should allow empty slug for root node", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        slug: "/",
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(true);
  });

  it("should detect invalid characters in slugs", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        children: [
          createNode({
            name: "About Us!",
            fullPath: "/about-us!",
            slug: "about-us!", // Invalid character
            parentFullPath: "/",
          }),
        ],
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === "invalid_slug_chars")).toBe(true);
  });

  it("should warn about duplicate names", () => {
    const tree: PageNode[] = [
      createNode({
        name: "Home",
        fullPath: "/",
        children: [
          createNode({
            name: "Page",
            fullPath: "/page-1",
            slug: "page-1",
            parentFullPath: "/",
          }),
          createNode({
            name: "Page", // Same name, different path
            fullPath: "/page-2",
            slug: "page-2",
            parentFullPath: "/",
          }),
        ],
      }),
    ];

    const result = validateTree(tree);

    expect(result.valid).toBe(true); // Warnings don't block
    expect(result.warnings.some((w) => w.type === "duplicate_name")).toBe(true);
  });

  it("should warn about multiple root nodes", () => {
    const tree: PageNode[] = [
      createNode({ name: "Home", fullPath: "/" }),
      createNode({ name: "Landing", fullPath: "/landing" }),
    ];

    const result = validateTree(tree);

    expect(result.warnings.some((w) => w.type === "multiple_roots")).toBe(true);
  });
});

describe("validateSlugEdit", () => {
  it("should return null for valid slug edit", () => {
    const nodes = new Map<string, PageNode>([
      ["/", createNode({ name: "Home", fullPath: "/" })],
      ["/about", createNode({ name: "About", fullPath: "/about", slug: "about", parentFullPath: "/" })],
    ]);

    const error = validateSlugEdit("/about", "about-us", nodes);

    expect(error).toBeNull();
  });

  it("should detect duplicate path from slug edit", () => {
    const nodes = new Map<string, PageNode>([
      ["/", createNode({ name: "Home", fullPath: "/" })],
      ["/about", createNode({ name: "About", fullPath: "/about", slug: "about", parentFullPath: "/" })],
      ["/contact", createNode({ name: "Contact", fullPath: "/contact", slug: "contact", parentFullPath: "/" })],
    ]);

    const error = validateSlugEdit("/about", "contact", nodes);

    expect(error).not.toBeNull();
    expect(error?.type).toBe("duplicate_fullpath");
  });

  it("should detect invalid characters in slug edit", () => {
    const nodes = new Map<string, PageNode>([
      ["/", createNode({ name: "Home", fullPath: "/" })],
      ["/about", createNode({ name: "About", fullPath: "/about", slug: "about", parentFullPath: "/" })],
    ]);

    const error = validateSlugEdit("/about", "about us!", nodes);

    expect(error).not.toBeNull();
    expect(error?.type).toBe("invalid_slug_chars");
  });

  it("should return null for non-existent node", () => {
    const nodes = new Map<string, PageNode>();

    const error = validateSlugEdit("/nonexistent", "new-slug", nodes);

    expect(error).toBeNull();
  });
});

describe("hasBlockingErrors", () => {
  it("should return true for duplicate fullpath errors", () => {
    const validation = {
      valid: false,
      errors: [{ type: "duplicate_fullpath" as const, message: "test" }],
      warnings: [],
    };

    expect(hasBlockingErrors(validation)).toBe(true);
  });

  it("should return true for empty name errors", () => {
    const validation = {
      valid: false,
      errors: [{ type: "empty_name" as const, message: "test" }],
      warnings: [],
    };

    expect(hasBlockingErrors(validation)).toBe(true);
  });

  it("should return true for empty slug errors", () => {
    const validation = {
      valid: false,
      errors: [{ type: "empty_slug" as const, message: "test" }],
      warnings: [],
    };

    expect(hasBlockingErrors(validation)).toBe(true);
  });

  it("should return false for warnings only", () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [{ type: "duplicate_name" as const, message: "test" }],
    };

    expect(hasBlockingErrors(validation)).toBe(false);
  });

  it("should return false for no errors", () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    expect(hasBlockingErrors(validation)).toBe(false);
  });
});

describe("getValidationSummary", () => {
  it("should count errors and warnings by type", () => {
    const validation = {
      valid: false,
      errors: [
        { type: "duplicate_fullpath" as const, message: "test1" },
        { type: "duplicate_fullpath" as const, message: "test2" },
        { type: "empty_name" as const, message: "test3" },
      ],
      warnings: [
        { type: "duplicate_name" as const, message: "test4" },
      ],
    };

    const summary = getValidationSummary(validation);

    expect(summary.errorCount).toBe(3);
    expect(summary.warningCount).toBe(1);
    expect(summary.byType.duplicate_fullpath).toBe(2);
    expect(summary.byType.empty_name).toBe(1);
    expect(summary.byType.duplicate_name).toBe(1);
  });

  it("should return zeros for empty validation", () => {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const summary = getValidationSummary(validation);

    expect(summary.errorCount).toBe(0);
    expect(summary.warningCount).toBe(0);
  });
});
