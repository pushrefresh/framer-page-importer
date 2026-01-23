/**
 * XML Parser for page tree import
 *
 * Handles XML with namespace: http://scope.pushrefresh.com/sitemap/1.0
 */

import type { XmlPageData, ParseResult } from "../types";

// Expected namespace
const SITEMAP_NAMESPACE = "http://scope.pushrefresh.com/sitemap/1.0";

interface ParsedXmlData {
  pages: XmlPageData[];
  projectInfo?: {
    name?: string;
    client?: string;
    date?: string;
  };
  warnings: string[];
}

/**
 * Get text content of an element, handling namespaced elements
 */
function getElementText(
  parent: Element,
  tagName: string,
  ns?: string
): string | undefined {
  // Try with namespace first
  let element = ns
    ? parent.getElementsByTagNameNS(ns, tagName)[0]
    : parent.getElementsByTagName(tagName)[0];

  // If not found with namespace, try without
  if (!element && ns) {
    element = parent.getElementsByTagName(tagName)[0];
  }

  // Also try with local name matching (for elements that might have prefixes)
  if (!element) {
    const allChildren = parent.children;
    for (let i = 0; i < allChildren.length; i++) {
      const child = allChildren[i];
      if (
        child.localName === tagName ||
        child.tagName === tagName ||
        child.tagName.endsWith(":" + tagName)
      ) {
        element = child;
        break;
      }
    }
  }

  return element?.textContent?.trim() || undefined;
}

/**
 * Get direct child elements by tag name, handling namespaces
 * Only returns immediate children, not all descendants
 */
function getDirectChildElements(
  parent: Element,
  tagName: string
): Element[] {
  const results: Element[] = [];
  const normalizedTagName = tagName.toLowerCase();

  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const childLocalName = child.localName?.toLowerCase() || child.tagName.toLowerCase();
    // Handle namespaced tags like "ns:page"
    const tagWithoutNs = childLocalName.includes(":")
      ? childLocalName.split(":").pop()
      : childLocalName;

    if (tagWithoutNs === normalizedTagName) {
      results.push(child);
    }
  }

  return results;
}

/**
 * Parse a single <page> element recursively
 */
function parsePageElement(
  element: Element,
  ns?: string,
  warnings: string[] = []
): XmlPageData | null {
  const name = getElementText(element, "name", ns);
  const slug = getElementText(element, "slug", ns);

  if (!name) {
    warnings.push(`Skipping page element without name`);
    return null;
  }

  const depthAttr = element.getAttribute("depth");
  const depth = depthAttr ? parseInt(depthAttr, 10) : undefined;

  const orderText = getElementText(element, "order", ns);
  const order = orderText ? parseInt(orderText, 10) : undefined;

  const pageData: XmlPageData = {
    name,
    slug: slug || "/", // Default to root if no slug
    depth,
    type: getElementText(element, "type", ns),
    complexity: getElementText(element, "complexity", ns),
    serviceType: getElementText(element, "serviceType", ns),
    description: getElementText(element, "description", ns),
    seoTitle: getElementText(element, "seoTitle", ns),
    cost: getElementText(element, "cost", ns),
    order,
    children: [],
  };

  // Parse children
  const childrenContainer =
    element.getElementsByTagNameNS(ns || "", "children")[0] ||
    element.getElementsByTagName("children")[0];

  if (childrenContainer) {
    const childPages = getDirectChildElements(childrenContainer, "page");
    for (const childEl of childPages) {
      const childData = parsePageElement(childEl, ns, warnings);
      if (childData) {
        pageData.children.push(childData);
      }
    }
  }

  return pageData;
}

/**
 * Parse XML content with sitemap namespace
 */
export function parseXml(content: string): ParseResult<ParsedXmlData> {
  const warnings: string[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/xml");

    // Check for parsing errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      return {
        success: false,
        error: `XML parsing error: ${parseError.textContent}`,
      };
    }

    // Find root sitemap element
    let sitemapEl =
      doc.getElementsByTagNameNS(SITEMAP_NAMESPACE, "sitemap")[0] ||
      doc.getElementsByTagName("sitemap")[0];

    // If no sitemap element, check if root is pages
    if (!sitemapEl) {
      sitemapEl =
        doc.getElementsByTagNameNS(SITEMAP_NAMESPACE, "pages")[0] ||
        doc.getElementsByTagName("pages")[0];
    }

    if (!sitemapEl) {
      return {
        success: false,
        error:
          "Could not find <sitemap> or <pages> root element in XML. Expected namespace: " +
          SITEMAP_NAMESPACE,
      };
    }

    // Determine namespace from document
    const ns =
      sitemapEl.namespaceURI === SITEMAP_NAMESPACE
        ? SITEMAP_NAMESPACE
        : sitemapEl.lookupNamespaceURI(null) || undefined;

    // Extract project info if available
    const projectEl =
      sitemapEl.getElementsByTagNameNS(ns || "", "project")[0] ||
      sitemapEl.getElementsByTagName("project")[0];

    const projectInfo = projectEl
      ? {
          name: getElementText(projectEl, "name", ns),
          client: getElementText(projectEl, "client", ns),
          date: getElementText(projectEl, "date", ns),
        }
      : undefined;

    // Find pages container
    let pagesContainer: Element | null = null;

    // If sitemapEl is already <pages>, use it directly
    if (
      sitemapEl.localName === "pages" ||
      sitemapEl.tagName === "pages" ||
      sitemapEl.tagName.endsWith(":pages")
    ) {
      pagesContainer = sitemapEl;
    } else {
      pagesContainer =
        sitemapEl.getElementsByTagNameNS(ns || "", "pages")[0] ||
        sitemapEl.getElementsByTagName("pages")[0];
    }

    if (!pagesContainer) {
      return {
        success: false,
        error: "Could not find <pages> element in XML",
      };
    }

    // Parse top-level pages - only direct children of pagesContainer
    const pages: XmlPageData[] = [];
    const rootPages = getDirectChildElements(pagesContainer, "page");

    for (const pageEl of rootPages) {
      const pageData = parsePageElement(pageEl, ns, warnings);
      if (pageData) {
        pages.push(pageData);
      }
    }

    if (pages.length === 0) {
      return {
        success: false,
        error: "No valid <page> elements found in XML",
      };
    }

    return {
      success: true,
      data: { pages, projectInfo, warnings },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `XML parsing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Detect if content is likely XML format
 */
export function isXmlContent(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.startsWith("<?xml") ||
    trimmed.startsWith("<sitemap") ||
    trimmed.startsWith("<pages")
  );
}
