/**
 * Framer Pages API wrapper
 *
 * Provides functions for creating and managing Framer pages
 */

import { framer, FrameNode, isWebPageNode } from "framer-plugin";
import type { PageNode, OperationResult } from "../types";

/**
 * Breakpoint frame info extracted from a template page
 */
interface BreakpointInfo {
  name: string | null;
  width: unknown;
  height: unknown;
  backgroundColor: unknown;
  isBreakpoint: boolean;
  isPrimaryBreakpoint: boolean;
}

/**
 * Cache for template breakpoints to avoid repeated lookups
 */
let templateBreakpointsCache: Map<string, BreakpointInfo[]> = new Map();

/**
 * Get breakpoint frames from a template page
 */
export async function getTemplateBreakpoints(
  templatePageId: string
): Promise<BreakpointInfo[]> {
  // Check cache first
  if (templateBreakpointsCache.has(templatePageId)) {
    return templateBreakpointsCache.get(templatePageId)!;
  }

  try {
    const templatePage = await framer.getNode(templatePageId);
    if (!templatePage) {
      console.warn("Template page not found:", templatePageId);
      return [];
    }

    console.log("Template page found:", templatePageId, templatePage);

    const children = await templatePage.getChildren();
    console.log("Template page children count:", children.length);

    const breakpoints: BreakpointInfo[] = [];

    for (const child of children) {
      // Log each child to understand the structure
      const frameChild = child as FrameNode;
      console.log("Child node:", {
        id: child.id,
        class: (child as any).__class,
        name: frameChild.name,
        isBreakpoint: frameChild.isBreakpoint,
        isPrimaryBreakpoint: frameChild.isPrimaryBreakpoint,
        width: frameChild.width,
        height: frameChild.height,
      });

      // Check if this is a FrameNode with breakpoint properties
      if (frameChild.isBreakpoint) {
        breakpoints.push({
          name: frameChild.name,
          width: frameChild.width,
          height: frameChild.height,
          backgroundColor: frameChild.backgroundColor,
          isBreakpoint: frameChild.isBreakpoint,
          isPrimaryBreakpoint: frameChild.isPrimaryBreakpoint,
        });
      }
    }

    console.log("Found breakpoints:", breakpoints.length);

    // Sort: primary breakpoint first, then by width (descending)
    breakpoints.sort((a, b) => {
      if (a.isPrimaryBreakpoint && !b.isPrimaryBreakpoint) return -1;
      if (!a.isPrimaryBreakpoint && b.isPrimaryBreakpoint) return 1;
      return 0;
    });

    // Cache the results
    templateBreakpointsCache.set(templatePageId, breakpoints);
    return breakpoints;
  } catch (error) {
    console.error("Failed to get template breakpoints:", error);
    return [];
  }
}

/**
 * Copy breakpoint frames from template to a new page
 * Uses WebPageNode.addBreakpoint() API for proper breakpoint creation
 */
async function copyBreakpointsToPage(
  newPageId: string,
  breakpoints: BreakpointInfo[]
): Promise<void> {
  if (breakpoints.length === 0) return;

  try {
    // Get the new page as a WebPageNode
    const newPage = await framer.getNode(newPageId);
    if (!newPage || !isWebPageNode(newPage)) {
      console.error("Could not find WebPageNode for ID:", newPageId);
      return;
    }

    // Check permissions upfront (isAllowedTo is synchronous)
    const canSetAttributes = framer.isAllowedTo("setAttributes");
    // Cast to any for undocumented API
    const canAddBreakpoint = (framer.isAllowedTo as any)("WebPageNode.addBreakpoint") as boolean;

    // Separate primary and non-primary breakpoints
    const primaryBreakpoint = breakpoints.find(bp => bp.isPrimaryBreakpoint);
    const nonPrimaryBreakpoints = breakpoints.filter(bp => !bp.isPrimaryBreakpoint);

    // Configure the existing primary breakpoint (created automatically with the page)
    if (primaryBreakpoint && canSetAttributes) {
      try {
        const children = await newPage.getChildren();
        const existingPrimary = children.find(child => {
          const frame = child as FrameNode;
          return frame.isPrimaryBreakpoint;
        }) as FrameNode | undefined;

        if (existingPrimary) {
          const attrs: Record<string, unknown> = {};
          if (primaryBreakpoint.name) attrs.name = primaryBreakpoint.name;
          if (primaryBreakpoint.width) attrs.width = primaryBreakpoint.width;
          if (primaryBreakpoint.height) attrs.height = primaryBreakpoint.height;
          if (primaryBreakpoint.backgroundColor) attrs.backgroundColor = primaryBreakpoint.backgroundColor;

          if (Object.keys(attrs).length > 0) {
            console.log(`Updating primary breakpoint: ${primaryBreakpoint.name}`);
            await existingPrimary.setAttributes(attrs as any);
          }
        }
      } catch (e) {
        console.warn("Could not update primary breakpoint:", e);
      }
    }

    // Add non-primary breakpoints (Tablet, Phone, etc.)
    if (!canAddBreakpoint) {
      console.warn("No permission to add breakpoints");
      return;
    }

    console.log(`Adding ${nonPrimaryBreakpoints.length} non-primary breakpoints to page`);

    // Get the existing primary breakpoint to use as a base
    const children = await newPage.getChildren();
    const existingBreakpoint = children.find(child => {
      const frame = child as FrameNode;
      return frame.isBreakpoint;
    }) as FrameNode | undefined;

    if (!existingBreakpoint) {
      console.warn("No existing breakpoint found to base new breakpoints on");
      return;
    }

    console.log("Using existing breakpoint as base:", existingBreakpoint.id, existingBreakpoint.name);

    for (const bp of nonPrimaryBreakpoints) {
      const widthNum = typeof bp.width === "number" ? bp.width : parseInt(String(bp.width), 10);
      const heightNum = typeof bp.height === "number" ? bp.height : parseInt(String(bp.height), 10);

      if (isNaN(widthNum) || widthNum <= 0) {
        console.warn("Invalid breakpoint width:", bp.width);
        continue;
      }

      const breakpointName = bp.name || `Breakpoint ${widthNum}`;

      console.log(`Adding breakpoint: ${breakpointName} at width ${widthNum}px`);

      // addBreakpoint(basedOnNodeId: string, breakpointConfig: { name, width, height, ... })
      // First param seems to be an existing breakpoint node ID to base the new one on
      const breakpointConfig: Record<string, unknown> = {
        name: breakpointName,
        width: widthNum,
      };
      if (!isNaN(heightNum) && heightNum > 0) {
        breakpointConfig.height = heightNum;
      }
      if (bp.backgroundColor) {
        breakpointConfig.backgroundColor = bp.backgroundColor;
      }

      // Use the WebPageNode's addBreakpoint method (undocumented API)
      // Pass existing breakpoint ID as base
      const newBreakpoint = await (newPage as any).addBreakpoint(existingBreakpoint.id, breakpointConfig) as FrameNode | null;

      // Log success
      if (newBreakpoint) {
        console.log(`Successfully created breakpoint: ${breakpointName}`);
      }
    }
  } catch (error) {
    console.error("Failed to copy breakpoints:", error);
  }
}

/**
 * Clear the template breakpoints cache
 */
export function clearTemplateCache(): void {
  templateBreakpointsCache.clear();
}

/**
 * Get all existing pages in the project
 */
export async function getExistingPages(): Promise<
  Array<{ id: string; name: string; path: string }>
> {
  try {
    // Use getNodesWithType to get all WebPageNodes in the project
    const webPages = await framer.getNodesWithType("WebPageNode");

    return webPages.map((page) => {
      const path = page.path || "/";
      // Generate a display name from the path
      let name: string;
      if (path === "/" || path === "") {
        name = "Home";
      } else {
        // Extract last segment of path and capitalize
        const segments = path.split("/").filter(Boolean);
        const lastSegment = segments[segments.length - 1] || "page";
        name = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, " ");
      }
      return { id: page.id, name, path };
    });
  } catch (error) {
    console.error("Failed to get existing pages:", error);
    return [];
  }
}

/**
 * Check if a page with the given path already exists
 */
export async function pageExists(path: string): Promise<string | null> {
  const pages = await getExistingPages();
  const normalizedPath = path.toLowerCase();

  const existing = pages.find(
    (p) =>
      p.path.toLowerCase() === normalizedPath ||
      p.path.toLowerCase() === normalizedPath + "/" ||
      (p.path + "/").toLowerCase() === normalizedPath
  );

  return existing?.id || null;
}

/**
 * Create a single static page
 */
export async function createPage(
  node: PageNode,
  templatePageId?: string,
  templateBreakpoints?: BreakpointInfo[]
): Promise<OperationResult> {
  try {
    // Skip root "/" - Framer always has a home page
    if (node.fullPath === "/" || node.fullPath === "") {
      return {
        type: "skip_page",
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.fullPath,
        success: true,
        details: "Skipped root page - Framer home page already exists",
      };
    }

    // Check if page already exists
    const existingId = await pageExists(node.fullPath);
    if (existingId) {
      return {
        type: "skip_page",
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.fullPath,
        success: true,
        details: `Page already exists with ID: ${existingId}`,
      };
    }

    // Check permission before creating web page
    const canCreateWebPage = framer.isAllowedTo("createWebPage");
    if (!canCreateWebPage) {
      return {
        type: "create_page",
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.fullPath,
        success: false,
        error: "Permission denied: createWebPage",
      };
    }

    // createWebPage takes just the path string
    const newPage = await framer.createWebPage(node.fullPath);

    if (!newPage) {
      throw new Error("Page creation returned null");
    }

    // Set the page name after creation (check permissions first)
    try {
      const canSetAttributes = framer.isAllowedTo("setAttributes");
      if (canSetAttributes) {
        await newPage.setAttributes({ name: node.name });
      }
    } catch (e) {
      // Name setting might fail, that's ok
      console.warn("Could not set page name:", e);
    }

    // Copy breakpoint frames from template if provided
    if (templateBreakpoints && templateBreakpoints.length > 0) {
      await copyBreakpointsToPage(newPage.id, templateBreakpoints);
    } else if (templatePageId) {
      // Fetch breakpoints if not pre-loaded
      const breakpoints = await getTemplateBreakpoints(templatePageId);
      if (breakpoints.length > 0) {
        await copyBreakpointsToPage(newPage.id, breakpoints);
      }
    }

    const breakpointCount = templateBreakpoints?.length || 0;
    const details = breakpointCount > 0
      ? `Created page with ID: ${newPage.id} (${breakpointCount} breakpoints)`
      : `Created page with ID: ${newPage.id}`;

    return {
      type: "create_page",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: true,
      details,
    };
  } catch (error) {
    return {
      type: "create_page",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing page
 */
export async function updatePage(
  node: PageNode,
  existingPageId: string
): Promise<OperationResult> {
  try {
    const pageNode = await framer.getNode(existingPageId);
    if (pageNode) {
      const canSetAttributes = framer.isAllowedTo("setAttributes");
      if (canSetAttributes) {
        await pageNode.setAttributes({ name: node.name });
      }
    }

    return {
      type: "update_page",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: true,
      details: `Updated page ${existingPageId}`,
    };
  } catch (error) {
    return {
      type: "update_page",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create multiple pages with progress callback
 */
export async function createPages(
  nodes: PageNode[],
  options: {
    templatePageId?: string;
    skipExisting?: boolean;
    updateExisting?: boolean;
    onProgress?: (completed: number, total: number, current: string) => void;
  } = {}
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];
  const { templatePageId, skipExisting = true, updateExisting = false } = options;

  // Pre-fetch template breakpoints once if a template is specified
  let templateBreakpoints: BreakpointInfo[] = [];
  if (templatePageId) {
    templateBreakpoints = await getTemplateBreakpoints(templatePageId);
    if (templateBreakpoints.length > 0) {
      console.log(`Found ${templateBreakpoints.length} breakpoints in template`);
    }
  }

  // Sort nodes by depth (parents first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const depthA = a.fullPath.split("/").filter(Boolean).length;
    const depthB = b.fullPath.split("/").filter(Boolean).length;
    return depthA - depthB;
  });

  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];

    options.onProgress?.(i, sortedNodes.length, node.name);

    const existingId = await pageExists(node.fullPath);

    if (existingId) {
      if (updateExisting) {
        const result = await updatePage(node, existingId);
        results.push(result);
      } else if (skipExisting) {
        results.push({
          type: "skip_page",
          nodeId: node.id,
          nodeName: node.name,
          nodePath: node.fullPath,
          success: true,
          details: "Page already exists",
        });
      } else {
        results.push({
          type: "skip_page",
          nodeId: node.id,
          nodeName: node.name,
          nodePath: node.fullPath,
          success: true,
          details: "Skipped to avoid duplicate",
        });
      }
    } else {
      // Pass pre-fetched breakpoints for efficiency
      const result = await createPage(node, templatePageId, templateBreakpoints);
      results.push(result);
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  options.onProgress?.(sortedNodes.length, sortedNodes.length, "Complete");

  return results;
}

/**
 * Get available pages that can be used as templates
 */
export async function getTemplateCandidates(): Promise<
  Array<{ id: string; name: string; path: string }>
> {
  return getExistingPages();
}
