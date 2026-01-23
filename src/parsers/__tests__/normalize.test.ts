/**
 * Unit tests for normalization utilities
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSlug,
  computeFullPath,
  normalizeFullPath,
  normalizeFromCsv,
  normalizeFromXml,
  flattenTree,
  countNodes,
  getMaxDepth,
} from "../normalize";
import type { CsvRow, XmlPageData } from "../../types";

describe("normalizeSlug", () => {
  it("should return / for root", () => {
    expect(normalizeSlug("/", true)).toBe("/");
    expect(normalizeSlug("", true)).toBe("/");
  });

  it("should remove leading slashes from non-root", () => {
    expect(normalizeSlug("/about")).toBe("about");
    expect(normalizeSlug("///solutions")).toBe("solutions");
  });

  it("should remove trailing slashes", () => {
    expect(normalizeSlug("about/")).toBe("about");
    expect(normalizeSlug("solutions//")).toBe("solutions");
  });

  it("should convert to lowercase", () => {
    expect(normalizeSlug("About")).toBe("about");
    expect(normalizeSlug("SOLUTIONS")).toBe("solutions");
  });

  it("should replace spaces with hyphens", () => {
    expect(normalizeSlug("about us")).toBe("about-us");
    expect(normalizeSlug("contact  us")).toBe("contact-us");
  });

  it("should remove consecutive hyphens", () => {
    expect(normalizeSlug("about--us")).toBe("about-us");
  });
});

describe("computeFullPath", () => {
  it("should return / for root slug", () => {
    expect(computeFullPath(undefined, "/")).toBe("/");
  });

  it("should compute path for first-level children", () => {
    expect(computeFullPath("/", "about")).toBe("/about");
    expect(computeFullPath("/", "solutions")).toBe("/solutions");
  });

  it("should compute path for nested children", () => {
    expect(computeFullPath("/solutions", "commercial")).toBe(
      "/solutions/commercial"
    );
    expect(computeFullPath("/about/team", "leadership")).toBe(
      "/about/team/leadership"
    );
  });

  it("should handle parent with trailing slash", () => {
    expect(computeFullPath("/solutions/", "commercial")).toBe(
      "/solutions/commercial"
    );
  });

  it("should normalize slug in the path", () => {
    expect(computeFullPath("/", "/About Us")).toBe("/about-us");
  });
});

describe("normalizeFullPath", () => {
  it("should return / for root", () => {
    expect(normalizeFullPath("/")).toBe("/");
    expect(normalizeFullPath("")).toBe("/");
  });

  it("should ensure leading slash", () => {
    expect(normalizeFullPath("about")).toBe("/about");
  });

  it("should remove duplicate slashes", () => {
    expect(normalizeFullPath("//about//us")).toBe("/about/us");
  });

  it("should remove trailing slash", () => {
    expect(normalizeFullPath("/about/")).toBe("/about");
    expect(normalizeFullPath("/solutions/commercial/")).toBe(
      "/solutions/commercial"
    );
  });
});

describe("normalizeFromCsv", () => {
  it("should build a simple tree", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "About", slug: "about", parentPage: "Home" },
      { name: "Contact", slug: "contact", parentPage: "Home" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    expect(result.data?.tree).toHaveLength(1);
    expect(result.data?.tree[0].name).toBe("Home");
    expect(result.data?.tree[0].fullPath).toBe("/");
    expect(result.data?.tree[0].children).toHaveLength(2);
  });

  it("should compute fullPath correctly for nested pages", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "Solutions", slug: "solutions", parentPage: "Home" },
      { name: "Commercial", slug: "commercial", parentPage: "Solutions" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    const solutions = result.data?.tree[0].children[0];
    expect(solutions?.fullPath).toBe("/solutions");
    const commercial = solutions?.children[0];
    expect(commercial?.fullPath).toBe("/solutions/commercial");
  });

  it("should handle multiple root pages", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "Landing", slug: "landing", parentPage: "" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    expect(result.data?.tree).toHaveLength(2);
    // Multiple root pages warning is issued during normalization
    expect(result.data?.warnings?.some((w) => w.includes("Multiple root pages"))).toBe(true);
  });

  it("should warn about duplicate names", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "About", slug: "about", parentPage: "Home" },
      { name: "About", slug: "about-team", parentPage: "Home" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    expect(result.data?.warnings?.some((w) => w.includes("Duplicate"))).toBe(
      true
    );
  });

  it("should warn about missing parent references", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "About", slug: "about", parentPage: "NonExistent" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    expect(
      result.data?.warnings?.some((w) => w.includes("doesn't exist"))
    ).toBe(true);
  });

  it("should fail if no root pages", () => {
    const rows: CsvRow[] = [
      { name: "About", slug: "about", parentPage: "Home" },
      { name: "Contact", slug: "contact", parentPage: "Home" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No root pages found");
  });

  it("should build flat map with all nodes", () => {
    const rows: CsvRow[] = [
      { name: "Home", slug: "/", parentPage: "" },
      { name: "About", slug: "about", parentPage: "Home" },
      { name: "Team", slug: "team", parentPage: "About" },
    ];

    const result = normalizeFromCsv(rows);

    expect(result.success).toBe(true);
    expect(result.data?.flatMap.size).toBe(3);
  });
});

describe("normalizeFromXml", () => {
  it("should build a simple tree from XML data", () => {
    const pages: XmlPageData[] = [
      {
        name: "Home",
        slug: "/",
        children: [
          { name: "About", slug: "about", children: [] },
          { name: "Contact", slug: "contact", children: [] },
        ],
      },
    ];

    const result = normalizeFromXml(pages);

    expect(result.success).toBe(true);
    expect(result.data?.tree).toHaveLength(1);
    expect(result.data?.tree[0].name).toBe("Home");
    expect(result.data?.tree[0].children).toHaveLength(2);
  });

  it("should compute fullPath correctly for nested XML", () => {
    const pages: XmlPageData[] = [
      {
        name: "Home",
        slug: "/",
        children: [
          {
            name: "Solutions",
            slug: "solutions",
            children: [{ name: "Commercial", slug: "commercial", children: [] }],
          },
        ],
      },
    ];

    const result = normalizeFromXml(pages);

    expect(result.success).toBe(true);
    const solutions = result.data?.tree[0].children[0];
    expect(solutions?.fullPath).toBe("/solutions");
    const commercial = solutions?.children[0];
    expect(commercial?.fullPath).toBe("/solutions/commercial");
  });

  it("should preserve optional fields", () => {
    const pages: XmlPageData[] = [
      {
        name: "Home",
        slug: "/",
        seoTitle: "Welcome Home",
        description: "Main page",
        order: 1,
        children: [],
      },
    ];

    const result = normalizeFromXml(pages);

    expect(result.success).toBe(true);
    expect(result.data?.tree[0].seoTitle).toBe("Welcome Home");
    expect(result.data?.tree[0].description).toBe("Main page");
    expect(result.data?.tree[0].order).toBe(1);
  });

  it("should sort children by order", () => {
    const pages: XmlPageData[] = [
      {
        name: "Home",
        slug: "/",
        children: [
          { name: "C", slug: "c", order: 3, children: [] },
          { name: "A", slug: "a", order: 1, children: [] },
          { name: "B", slug: "b", order: 2, children: [] },
        ],
      },
    ];

    const result = normalizeFromXml(pages);

    expect(result.success).toBe(true);
    const children = result.data?.tree[0].children || [];
    expect(children[0].name).toBe("A");
    expect(children[1].name).toBe("B");
    expect(children[2].name).toBe("C");
  });

  it("should fail on empty pages array", () => {
    const result = normalizeFromXml([]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No pages found");
  });
});

describe("flattenTree", () => {
  it("should flatten a nested tree", () => {
    const tree = [
      {
        id: "1",
        name: "Home",
        slug: "/",
        fullPath: "/",
        children: [
          {
            id: "2",
            name: "About",
            slug: "about",
            fullPath: "/about",
            parentFullPath: "/",
            children: [],
          },
        ],
      },
    ] as any[];

    const flat = flattenTree(tree);

    expect(flat).toHaveLength(2);
    expect(flat[0].name).toBe("Home");
    expect(flat[1].name).toBe("About");
  });

  it("should preserve depth-first order", () => {
    const tree = [
      {
        id: "1",
        name: "A",
        slug: "a",
        fullPath: "/a",
        children: [
          {
            id: "2",
            name: "A1",
            slug: "a1",
            fullPath: "/a/a1",
            parentFullPath: "/a",
            children: [],
          },
        ],
      },
      {
        id: "3",
        name: "B",
        slug: "b",
        fullPath: "/b",
        children: [],
      },
    ] as any[];

    const flat = flattenTree(tree);

    expect(flat.map((n) => n.name)).toEqual(["A", "A1", "B"]);
  });
});

describe("countNodes", () => {
  it("should count all nodes in tree", () => {
    const tree = [
      {
        id: "1",
        name: "Home",
        slug: "/",
        fullPath: "/",
        children: [
          {
            id: "2",
            name: "About",
            slug: "about",
            fullPath: "/about",
            children: [
              {
                id: "3",
                name: "Team",
                slug: "team",
                fullPath: "/about/team",
                children: [],
              },
            ],
          },
        ],
      },
    ] as any[];

    expect(countNodes(tree)).toBe(3);
  });

  it("should return 0 for empty tree", () => {
    expect(countNodes([])).toBe(0);
  });
});

describe("getMaxDepth", () => {
  it("should return max depth of tree", () => {
    const tree = [
      {
        id: "1",
        name: "Home",
        slug: "/",
        fullPath: "/",
        children: [
          {
            id: "2",
            name: "About",
            slug: "about",
            fullPath: "/about",
            children: [
              {
                id: "3",
                name: "Team",
                slug: "team",
                fullPath: "/about/team",
                children: [],
              },
            ],
          },
        ],
      },
    ] as any[];

    expect(getMaxDepth(tree)).toBe(2);
  });

  it("should return 0 for single level", () => {
    const tree = [
      {
        id: "1",
        name: "Home",
        slug: "/",
        fullPath: "/",
        children: [],
      },
    ] as any[];

    expect(getMaxDepth(tree)).toBe(0);
  });

  it("should return 0 for empty tree", () => {
    expect(getMaxDepth([])).toBe(0);
  });
});
