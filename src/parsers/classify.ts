/**
 * Page classification utilities
 *
 * Detects CMS patterns and classifies pages into:
 * - static: Regular static pages
 * - cms-hub: Parent pages that list/index CMS items (e.g., "Blog", "Services")
 * - cms-template: Dynamic template pages (usually with [slug] pattern)
 * - cms-item: Individual CMS content items
 */

import type { PageNode, PageType } from "../types";

/**
 * Patterns that indicate a CMS hub page
 */
const CMS_HUB_TYPE_PATTERNS = [
  /cms[\s_-]*hub/i,
  /collection[\s_-]*hub/i,
  /dynamic[\s_-]*hub/i,
  /listing[\s_-]*page/i,
];

/**
 * Patterns that indicate a CMS template page (the Framer [slug] template definition)
 * This represents the template structure, not an actual page to create
 */
const CMS_TEMPLATE_TYPE_PATTERNS = [
  /^cms[\s_-]*template$/i,  // Exact match for "cms_template"
  /dynamic[\s_-]*template/i,
  /framer[\s_-]*template/i,
  /slug[\s_-]*template/i,
];

/**
 * Patterns that indicate a CMS item (individual entries to import into CMS)
 */
const CMS_ITEM_TYPE_PATTERNS = [
  /^cms[\s_-]*item$/i,  // Exact match for "cms_item"
  /collection[\s_-]*item/i,
  /cms[\s_-]*entry/i,
  /blog[\s_-]*post/i,
];

/**
 * Patterns in slug/path that indicate a CMS template
 */
const CMS_TEMPLATE_PATH_PATTERNS = [
  /\[.*\]/, // [slug], [id], etc.
  /\{.*\}/, // {slug}, {id}, etc.
  /:slug/i, // :slug pattern
];

/**
 * Classify a single page based on its type string and path
 */
export function classifyPageType(
  sourceType: string | undefined,
  slug: string,
  fullPath: string
): PageType {
  const type = sourceType?.toLowerCase().trim() || "";

  // Check for explicit CMS hub type
  for (const pattern of CMS_HUB_TYPE_PATTERNS) {
    if (pattern.test(type)) {
      return "cms-hub";
    }
  }

  // Check for explicit CMS template type
  for (const pattern of CMS_TEMPLATE_TYPE_PATTERNS) {
    if (pattern.test(type)) {
      return "cms-template";
    }
  }

  // Check for explicit CMS item type
  for (const pattern of CMS_ITEM_TYPE_PATTERNS) {
    if (pattern.test(type)) {
      return "cms-item";
    }
  }

  // Check for template path patterns
  for (const pattern of CMS_TEMPLATE_PATH_PATTERNS) {
    if (pattern.test(slug) || pattern.test(fullPath)) {
      return "cms-template";
    }
  }

  // Default to static
  return "static";
}

/**
 * Infer CMS collection name from a hub page
 */
export function inferCollectionName(node: PageNode): string {
  // Use the page name as the collection name
  // Remove common suffixes like "Hub", "Index", "List"
  let name = node.name
    .replace(/\s*(hub|index|list|listing|collection)$/i, "")
    .trim();

  // If empty after cleanup, use original name
  if (!name) {
    name = node.name;
  }

  return name;
}

/**
 * Apply classification to a page tree
 * This does a second pass to detect CMS patterns based on structure:
 * - cms_hub → cms_template → cms_item hierarchy
 * - Propagate collection name through the tree
 */
export function classifyTree(tree: PageNode[]): PageNode[] {
  function processNode(
    node: PageNode,
    parentCollectionName?: string,
    inCmsContext: boolean = false
  ): PageNode {
    // First, classify based on source type and path
    let pageType = classifyPageType(node.sourceType, node.slug, node.fullPath);
    let cmsCollectionName: string | undefined;

    // Set collection name for hubs
    if (pageType === "cms-hub") {
      cmsCollectionName = inferCollectionName(node);
    }

    // CMS templates and items inherit the collection name
    if ((pageType === "cms-template" || pageType === "cms-item") && parentCollectionName) {
      cmsCollectionName = parentCollectionName;
    }

    // Determine the collection context for children
    // Hub starts a new context, template continues it
    const collectionForChildren =
      pageType === "cms-hub" ? (cmsCollectionName || inferCollectionName(node)) :
      pageType === "cms-template" ? parentCollectionName :
      parentCollectionName;

    // Are we in a CMS context? (under a hub or template)
    const childInCmsContext =
      pageType === "cms-hub" ||
      pageType === "cms-template" ||
      inCmsContext;

    // Process children
    const processedChildren = node.children.map(child =>
      processNode(child, collectionForChildren, childInCmsContext)
    );

    // Detect hub pattern: if most children have the same structure/type pattern
    // and there are multiple children, this might be a CMS hub
    if (pageType === "static" && processedChildren.length >= 3) {
      const childTypes = processedChildren.map(c => c.sourceType?.toLowerCase() || "");
      const uniqueTypes = new Set(childTypes.filter(t => t));

      // If all children have the same type (and it's not empty), this might be a hub
      if (uniqueTypes.size === 1 && childTypes[0]) {
        // Check if the children type suggests CMS items
        const childType = childTypes[0];
        if (
          childType.includes("item") ||
          childType.includes("post") ||
          childType.includes("article") ||
          childType.includes("entry")
        ) {
          pageType = "cms-hub";
          cmsCollectionName = inferCollectionName(node);
          // Re-process children with the collection context
          return {
            ...node,
            pageType,
            cmsCollectionName,
            children: node.children.map(child =>
              processNode(child, cmsCollectionName, true)
            ),
          };
        }
      }
    }

    return {
      ...node,
      pageType,
      cmsCollectionName,
      children: processedChildren,
    };
  }

  return tree.map(node => processNode(node));
}

/**
 * Summary of page classifications
 */
export interface ClassificationSummary {
  staticCount: number;
  cmsHubs: Array<{
    name: string;
    collectionName: string;
    itemCount: number;
    path: string;
  }>;
  cmsTemplateCount: number;
  totalCmsItems: number;
}

/**
 * Get a summary of page classifications
 */
export function getClassificationSummary(tree: PageNode[]): ClassificationSummary {
  const summary: ClassificationSummary = {
    staticCount: 0,
    cmsHubs: [],
    cmsTemplateCount: 0,
    totalCmsItems: 0,
  };

  function walk(nodes: PageNode[]) {
    for (const node of nodes) {
      switch (node.pageType) {
        case "static":
          summary.staticCount++;
          break;
        case "cms-hub":
          const itemCount = countCmsItems(node.children);
          summary.cmsHubs.push({
            name: node.name,
            collectionName: node.cmsCollectionName || node.name,
            itemCount,
            path: node.fullPath,
          });
          break;
        case "cms-template":
          summary.cmsTemplateCount++;
          break;
        case "cms-item":
          summary.totalCmsItems++;
          break;
      }

      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return summary;
}

/**
 * Count CMS items under a node (including nested)
 */
function countCmsItems(nodes: PageNode[]): number {
  let count = 0;

  function walk(children: PageNode[]) {
    for (const child of children) {
      if (child.pageType === "cms-item") {
        count++;
      }
      if (child.children.length > 0) {
        walk(child.children);
      }
    }
  }

  walk(nodes);
  return count;
}

/**
 * Get only static pages from the tree (excludes CMS hubs, templates, and items)
 */
export function getStaticPages(tree: PageNode[]): PageNode[] {
  const result: PageNode[] = [];

  function walk(nodes: PageNode[]) {
    for (const node of nodes) {
      if (node.pageType === "static") {
        result.push(node);
      }
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return result;
}

/**
 * Get CMS items grouped by their hub/collection
 */
export function getCmsItemsByCollection(tree: PageNode[]): Map<string, PageNode[]> {
  const collections = new Map<string, PageNode[]>();

  function walk(nodes: PageNode[], currentCollection?: string) {
    for (const node of nodes) {
      if (node.pageType === "cms-hub") {
        // Start a new collection context
        const collectionName = node.cmsCollectionName || node.name;
        if (!collections.has(collectionName)) {
          collections.set(collectionName, []);
        }
        // Walk children with this collection context
        if (node.children.length > 0) {
          walk(node.children, collectionName);
        }
      } else if (node.pageType === "cms-item" && currentCollection) {
        // Add to current collection
        collections.get(currentCollection)!.push(node);
        // Continue walking children
        if (node.children.length > 0) {
          walk(node.children, currentCollection);
        }
      } else {
        // Regular node, continue walking
        if (node.children.length > 0) {
          walk(node.children, currentCollection);
        }
      }
    }
  }

  walk(tree);
  return collections;
}
