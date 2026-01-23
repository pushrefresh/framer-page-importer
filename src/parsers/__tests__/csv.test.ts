/**
 * Unit tests for CSV parser
 */

import { describe, it, expect } from "vitest";
import { parseCsv, isCsvContent } from "../csv";

describe("parseCsv", () => {
  it("should parse a simple CSV with correct headers", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
About,about,Static Page,Low,Design Only,Home,1,$300`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(2);
    expect(result.data?.rows[0]).toEqual({
      name: "Home",
      slug: "/",
      type: "Static Page",
      complexity: "Low",
      serviceType: "Design Only",
      parentPage: "",
      depth: 0,
      cost: "$500",
    });
    expect(result.data?.rows[1].name).toBe("About");
    expect(result.data?.rows[1].slug).toBe("about");
    expect(result.data?.rows[1].parentPage).toBe("Home");
  });

  it("should handle the comma-in-cost issue", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,High,Full Build,,0,$4,000
Solutions,solutions,Static Page,Medium,Design Only,Home,1,$2,500`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(2);
    // Cost should be rejoined: "$4,000" not split
    expect(result.data?.rows[0].cost).toBe("$4,000");
    expect(result.data?.rows[1].cost).toBe("$2,500");
  });

  it("should handle multiple commas in cost field", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Enterprise,enterprise,Static Page,High,Full Build,,0,$1,234,567`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows[0].cost).toBe("$1,234,567");
  });

  it("should skip summary rows", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
Total Pages,,,,,,,10
Total Cost,,,,,,,$5,000`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(1);
    expect(result.data?.rows[0].name).toBe("Home");
  });

  it("should skip rows with blank name and slug", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
,,,,,,0,
About,about,Static Page,Low,Design Only,Home,1,$300`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(2);
  });

  it("should parse depth as number", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
Level 1,l1,Static Page,Low,Design Only,Home,1,$300
Level 2,l2,Static Page,Low,Design Only,Level 1,2,$300`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows[0].depth).toBe(0);
    expect(result.data?.rows[1].depth).toBe(1);
    expect(result.data?.rows[2].depth).toBe(2);
  });

  it("should handle missing optional columns", () => {
    const csv = `Name,Slug,Parent Page
Home,/,
About,about,Home`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(2);
    expect(result.data?.rows[0].name).toBe("Home");
    expect(result.data?.rows[0].slug).toBe("/");
  });

  it("should fail on missing required Name column", () => {
    const csv = `Slug,Type,Parent Page
/,Static Page,
about,Static Page,Home`;

    const result = parseCsv(csv);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Name");
  });

  it("should fail on missing required Slug column", () => {
    const csv = `Name,Type,Parent Page
Home,Static Page,
About,Static Page,Home`;

    const result = parseCsv(csv);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Slug");
  });

  it("should fail on empty file", () => {
    const result = parseCsv("");

    expect(result.success).toBe(false);
  });

  it("should fail on header-only file", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost`;

    const result = parseCsv(csv);

    expect(result.success).toBe(false);
    expect(result.error).toContain("at least one data row");
  });

  it("should handle quoted fields", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
"Home Page",/,Static Page,Low,Design Only,,0,"$1,000"
"About Us",about,Static Page,Low,Design Only,Home Page,1,$500`;

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows[0].name).toBe("Home Page");
    expect(result.data?.rows[0].cost).toBe("$1,000");
    expect(result.data?.rows[1].name).toBe("About Us");
    expect(result.data?.rows[1].parentPage).toBe("Home Page");
  });

  it("should handle Windows-style line endings", () => {
    const csv = "Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost\r\nHome,/,Static Page,Low,Design Only,,0,$500\r\nAbout,about,Static Page,Low,Design Only,Home,1,$300";

    const result = parseCsv(csv);

    expect(result.success).toBe(true);
    expect(result.data?.rows).toHaveLength(2);
  });
});

describe("isCsvContent", () => {
  it("should detect CSV content by headers", () => {
    const csv = `Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500`;

    expect(isCsvContent(csv)).toBe(true);
  });

  it("should detect CSV with just Name header", () => {
    const csv = `Name,Other
Home,value`;

    expect(isCsvContent(csv)).toBe(true);
  });

  it("should detect CSV with just Slug header", () => {
    const csv = `Slug,Other
/,value`;

    expect(isCsvContent(csv)).toBe(true);
  });

  it("should not detect XML as CSV", () => {
    const xml = `<?xml version="1.0"?>
<sitemap><pages></pages></sitemap>`;

    expect(isCsvContent(xml)).toBe(false);
  });

  it("should not detect content without commas", () => {
    const text = `Name Slug Type`;

    expect(isCsvContent(text)).toBe(false);
  });
});
