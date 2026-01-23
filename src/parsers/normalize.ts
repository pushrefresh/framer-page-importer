/**
 * Normalization utilities to convert parsed CSV/XML data into PageNode tree
 */

import { v5 as uuidv5 } from "uuid";
import type { PageNode, CsvRow, XmlPageData, ParseResult } from "../types";
import { classifyPageType, classifyTree } from "./classify";

// Namespace UUID for generating stable IDs
const NAMESPACE_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

/**
 * Generate a stable ID from a path string
 */
export function generateNodeId(fullPath: string): string {
  return uuidv5(fullPath, NAMESPACE_UUID);
}

/**
 * Normalize a slug segment:
 * - Root "/" stays as "/"
 * - Remove leading/trailing slashes from non-root slugs
 * - Convert to lowercase
 * - Replace spaces with hyphens
 * - Remove invalid characters
 */
export function normalizeSlug(slug: string, isRoot: boolean = false): string {
  if (!slug || slug === "/" || isRoot) {
    return "/";
  }

  let normalized = slug
    .trim()
    .toLowerCase()
    // Remove leading slashes
    .replace(/^\/+/, "")
    // Remove trailing slashes
    .replace(/\/+$/, "")
    // Replace spaces with hyphens
    .replace(/\s+/g, "-")
    // Remove consecutive hyphens
    .replace(/-+/g, "-");

  // If after normalization it's empty, return the original trimmed
  if (!normalized) {
    normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  }

  return normalized;
}

/**
 * Compute full path from parent path and slug
 */
export function computeFullPath(
  parentFullPath: string | undefined,
  slug: string
): string {
  // Root case
  if (slug === "/" || !slug) {
    return "/";
  }

  const normalizedSlug = normalizeSlug(slug);

  // If no parent or parent is root
  if (!parentFullPath || parentFullPath === "/") {
    return "/" + normalizedSlug;
  }

  // Join parent and slug
  const path = parentFullPath.replace(/\/+$/, "") + "/" + normalizedSlug;

  // Normalize: remove duplicate slashes, ensure leading slash
  return path.replace(/\/+/g, "/");
}

/**
 * Normalize repeated slashes and ensure proper format
 */
export function normalizeFullPath(path: string): string {
  if (!path || path === "/") {
    return "/";
  }

  let normalized = path
    // Ensure leading slash
    .replace(/^([^/])/, "/$1")
    // Remove duplicate slashes
    .replace(/\/+/g, "/")
    // Remove trailing slash (except for root)
    .replace(/\/+$/, "");

  // Ensure we have at least "/"
  if (!normalized) {
    normalized = "/";
  }

  return normalized;
}

interface NormalizeFromCsvResult {
  tree: PageNode[];
  flatMap: Map<string, PageNode>;
  warnings: string[];
}

/**
 * Build PageNode tree from CSV rows
 *
 * CSV uses "Parent Page" (parent name) to define hierarchy.
 * We need to:
 * 1. Build a map of name -> row
 * 2. Find root nodes (no parent)
 * 3. Build tree recursively
 * 4. Compute fullPath for each node
 */
export function normalizeFromCsv(
  rows: CsvRow[]
): ParseResult<NormalizeFromCsvResult> {
  const warnings: string[] = [];

  // Map rows by name for parent lookup
  const rowsByName = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;

    if (!rowsByName.has(name)) {
      rowsByName.set(name, []);
    }
    rowsByName.get(name)!.push(row);
  }

  // Check for duplicate names
  for (const [name, nameRows] of rowsByName) {
    if (nameRows.length > 1) {
      warnings.push(
        `Duplicate page name "${name}" found ${nameRows.length} times. Using first occurrence for parent references.`
      );
    }
  }

  // Find root nodes (no parent or parent is empty)
  const rootRows: CsvRow[] = [];
  const childRows: CsvRow[] = [];

  for (const row of rows) {
    if (!row.name.trim()) continue;

    const parentName = row.parentPage?.trim();
    if (!parentName) {
      rootRows.push(row);
    } else {
      childRows.push(row);
    }
  }

  if (rootRows.length === 0) {
    return {
      success: false,
      error:
        "No root pages found. At least one page must have no Parent Page.",
    };
  }

  if (rootRows.length > 1) {
    warnings.push(
      `Multiple root pages found: ${rootRows.map((r) => r.name).join(", ")}. All will be treated as top-level pages.`
    );
  }

  // Build flat map for quick lookup
  const flatMap = new Map<string, PageNode>();

  // Recursive function to build node and its children
  function buildNode(row: CsvRow, parentFullPath?: string): PageNode {
    const name = row.name.trim();
    const isRoot = !parentFullPath && (row.slug === "/" || row.slug === "");
    const slug = normalizeSlug(row.slug || name, isRoot);
    const fullPath = isRoot ? "/" : computeFullPath(parentFullPath, slug);
    const sourceType = row.type?.trim();

    const node: PageNode = {
      id: generateNodeId(fullPath),
      name,
      slug,
      fullPath,
      parentFullPath,
      sourceType,
      pageType: classifyPageType(sourceType, slug, fullPath),
      children: [],
    };

    // Find children (rows where parentPage matches this node's name)
    const children = rows.filter(
      (r) => r.parentPage?.trim() === name && r.name.trim() !== name
    );

    // Sort children by depth if available, then by order of appearance
    children.sort((a, b) => {
      if (a.depth !== undefined && b.depth !== undefined) {
        return a.depth - b.depth;
      }
      return 0;
    });

    // Build child nodes
    for (const childRow of children) {
      const childNode = buildNode(childRow, fullPath);
      node.children.push(childNode);
    }

    flatMap.set(node.id, node);
    return node;
  }

  // Build tree from root nodes
  let tree: PageNode[] = [];
  for (const rootRow of rootRows) {
    const rootNode = buildNode(rootRow, undefined);
    tree.push(rootNode);
  }

  // Check for orphaned nodes (have parent but parent not found)
  const allNodeNames = new Set(rows.map((r) => r.name.trim()).filter(Boolean));
  for (const row of childRows) {
    const parentName = row.parentPage?.trim();
    if (parentName && !allNodeNames.has(parentName)) {
      warnings.push(
        `Page "${row.name}" references parent "${parentName}" which doesn't exist`
      );
    }
  }

  // Apply second-pass classification based on tree structure
  tree = classifyTree(tree);

  // Rebuild flat map after classification
  flatMap.clear();
  const walkForMap = (nodes: PageNode[]) => {
    for (const n of nodes) {
      flatMap.set(n.id, n);
      if (n.children.length > 0) walkForMap(n.children);
    }
  };
  walkForMap(tree);

  return {
    success: true,
    data: { tree, flatMap, warnings },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

interface NormalizeFromXmlResult {
  tree: PageNode[];
  flatMap: Map<string, PageNode>;
  warnings: string[];
}

/**
 * Build PageNode tree from parsed XML data
 *
 * XML already has hierarchical structure via children, so we just need to:
 * 1. Walk the tree
 * 2. Compute fullPath at each level
 * 3. Create PageNode objects
 */
export function normalizeFromXml(
  pages: XmlPageData[]
): ParseResult<NormalizeFromXmlResult> {
  const warnings: string[] = [];
  const flatMap = new Map<string, PageNode>();

  function buildNode(
    xmlPage: XmlPageData,
    parentFullPath?: string,
    orderIndex?: number,
    effectiveParentPath?: string // Path to use for children (skips cms_template)
  ): PageNode {
    const name = xmlPage.name.trim();
    const isRoot = !parentFullPath && (xmlPage.slug === "/" || !xmlPage.slug);
    const slug = normalizeSlug(xmlPage.slug || "/", isRoot);
    const sourceType = xmlPage.type?.trim();
    const pageType = classifyPageType(sourceType, slug, "");

    // For cms_template nodes, use the effective parent path (skip this node's slug)
    // This prevents paths like /solutions/solutions/item becoming /solutions/item
    const isCmsTemplate = pageType === "cms-template";
    const fullPath = isRoot ? "/" : computeFullPath(effectiveParentPath || parentFullPath, slug);

    // Determine what path children should use
    // If this is a cms_template, children should use the same effective parent path (skip template slug)
    const childEffectivePath = isCmsTemplate ? (effectiveParentPath || parentFullPath) : fullPath;

    const node: PageNode = {
      id: generateNodeId(fullPath),
      name,
      slug,
      fullPath,
      parentFullPath,
      order: xmlPage.order ?? orderIndex,
      seoTitle: xmlPage.seoTitle,
      description: xmlPage.description,
      sourceType,
      pageType,
      children: [],
    };

    // Build children recursively
    if (xmlPage.children && xmlPage.children.length > 0) {
      // Sort children by order if available
      const sortedChildren = [...xmlPage.children].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return 0;
      });

      for (let i = 0; i < sortedChildren.length; i++) {
        const childNode = buildNode(sortedChildren[i], fullPath, i, childEffectivePath);
        node.children.push(childNode);
      }
    }

    flatMap.set(node.id, node);
    return node;
  }

  // Build tree from top-level pages
  let tree: PageNode[] = [];

  // Sort top-level pages by order if available
  const sortedPages = [...pages].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return 0;
  });

  for (let i = 0; i < sortedPages.length; i++) {
    const rootNode = buildNode(sortedPages[i], undefined, i);
    tree.push(rootNode);
  }

  if (tree.length === 0) {
    return {
      success: false,
      error: "No pages found in XML data",
    };
  }

  // Apply second-pass classification based on tree structure
  tree = classifyTree(tree);

  // Rebuild flat map after classification
  flatMap.clear();
  const walkForMap = (nodes: PageNode[]) => {
    for (const n of nodes) {
      flatMap.set(n.id, n);
      if (n.children.length > 0) walkForMap(n.children);
    }
  };
  walkForMap(tree);

  return {
    success: true,
    data: { tree, flatMap, warnings },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Flatten a page tree into an array (depth-first)
 */
export function flattenTree(tree: PageNode[]): PageNode[] {
  const result: PageNode[] = [];

  function walk(nodes: PageNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return result;
}

/**
 * Get total node count in tree
 */
export function countNodes(tree: PageNode[]): number {
  let count = 0;

  function walk(nodes: PageNode[]) {
    for (const node of nodes) {
      count++;
      if (node.children.length > 0) {
        walk(node.children);
      }
    }
  }

  walk(tree);
  return count;
}

/**
 * Get max depth of tree
 */
export function getMaxDepth(tree: PageNode[]): number {
  let maxDepth = 0;

  function walk(nodes: PageNode[], depth: number) {
    if (depth > maxDepth) maxDepth = depth;
    for (const node of nodes) {
      if (node.children.length > 0) {
        walk(node.children, depth + 1);
      }
    }
  }

  walk(tree, 0);
  return maxDepth;
}
