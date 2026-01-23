/**
 * Unit tests for XML parser
 */

import { describe, it, expect } from "vitest";
import { parseXml, isXmlContent } from "../xml";

describe("parseXml", () => {
  it("should parse a simple XML sitemap", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <type>Static Page</type>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0].name).toBe("Home");
    expect(result.data?.pages[0].slug).toBe("/");
  });

  it("should parse nested children", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <children>
        <page depth="1">
          <name>About</name>
          <slug>about</slug>
          <children>
            <page depth="2">
              <name>Team</name>
              <slug>team</slug>
            </page>
          </children>
        </page>
      </children>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0].children).toHaveLength(1);
    expect(result.data?.pages[0].children[0].name).toBe("About");
    expect(result.data?.pages[0].children[0].children).toHaveLength(1);
    expect(result.data?.pages[0].children[0].children[0].name).toBe("Team");
  });

  it("should parse multiple root pages", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
    </page>
    <page depth="0">
      <name>Landing</name>
      <slug>landing</slug>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(2);
    expect(result.data?.pages[0].name).toBe("Home");
    expect(result.data?.pages[1].name).toBe("Landing");
  });

  it("should parse optional fields", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <description>Welcome to our site</description>
      <seoTitle>Home | My Site</seoTitle>
      <order>1</order>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages[0].description).toBe("Welcome to our site");
    expect(result.data?.pages[0].seoTitle).toBe("Home | My Site");
    expect(result.data?.pages[0].order).toBe(1);
  });

  it("should parse project info", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <project>
    <name>My Project</name>
    <client>Acme Corp</client>
    <date>2024-01-15</date>
  </project>
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.projectInfo?.name).toBe("My Project");
    expect(result.data?.projectInfo?.client).toBe("Acme Corp");
    expect(result.data?.projectInfo?.date).toBe("2024-01-15");
  });

  it("should handle XML without namespace", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap>
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(1);
  });

  it("should handle <pages> as root element", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<pages xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <page depth="0">
    <name>Home</name>
    <slug>/</slug>
  </page>
</pages>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(1);
  });

  it("should parse depth attribute", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemap>
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <children>
        <page depth="1">
          <name>About</name>
          <slug>about</slug>
        </page>
      </children>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages[0].depth).toBe(0);
    expect(result.data?.pages[0].children[0].depth).toBe(1);
  });

  it("should fail on invalid XML", () => {
    const xml = `<?xml version="1.0"?>
<sitemap>
  <pages>
    <page>
      <name>Home</name>
      <slug>/</slug>
    <!-- missing closing tags -->`;

    const result = parseXml(xml);

    expect(result.success).toBe(false);
    expect(result.error).toContain("parsing error");
  });

  it("should fail on XML without sitemap or pages element", () => {
    const xml = `<?xml version="1.0"?>
<root>
  <item>test</item>
</root>`;

    const result = parseXml(xml);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Could not find");
  });

  it("should fail on empty pages", () => {
    const xml = `<?xml version="1.0"?>
<sitemap>
  <pages>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(false);
    expect(result.error).toContain("No valid <page> elements");
  });

  it("should skip pages without name", () => {
    const xml = `<?xml version="1.0"?>
<sitemap>
  <pages>
    <page depth="0">
      <slug>/</slug>
    </page>
    <page depth="0">
      <name>Valid</name>
      <slug>/valid</slug>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages).toHaveLength(1);
    expect(result.data?.pages[0].name).toBe("Valid");
    expect(result.data?.warnings).toContain("Skipping page element without name");
  });

  it("should handle whitespace in text content", () => {
    const xml = `<?xml version="1.0"?>
<sitemap>
  <pages>
    <page depth="0">
      <name>  Home Page  </name>
      <slug>  /  </slug>
    </page>
  </pages>
</sitemap>`;

    const result = parseXml(xml);

    expect(result.success).toBe(true);
    expect(result.data?.pages[0].name).toBe("Home Page");
    expect(result.data?.pages[0].slug).toBe("/");
  });
});

describe("isXmlContent", () => {
  it("should detect XML declaration", () => {
    expect(isXmlContent(`<?xml version="1.0"?><sitemap></sitemap>`)).toBe(true);
  });

  it("should detect sitemap root element", () => {
    expect(isXmlContent(`<sitemap><pages></pages></sitemap>`)).toBe(true);
  });

  it("should detect pages root element", () => {
    expect(isXmlContent(`<pages><page></page></pages>`)).toBe(true);
  });

  it("should not detect CSV as XML", () => {
    expect(isXmlContent(`Name,Slug,Type\nHome,/,Static`)).toBe(false);
  });

  it("should not detect plain text as XML", () => {
    expect(isXmlContent(`This is just plain text`)).toBe(false);
  });

  it("should handle whitespace before XML", () => {
    expect(isXmlContent(`  <?xml version="1.0"?><sitemap></sitemap>`)).toBe(true);
  });
});
