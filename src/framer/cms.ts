/**
 * Framer CMS API wrapper
 *
 * Provides functions for creating and managing CMS collections and items
 */

import { framer, ManagedCollection } from "framer-plugin";
import type { PageNode, OperationResult, CmsOptions } from "../types";

interface CmsCollectionInfo {
  id: string;
  name: string;
  slug: string;
}

interface CmsItem {
  id: string;
  slug?: string;
  fieldData: Record<string, unknown>;
}

/**
 * Get the current/active collection when plugin is opened from a collection
 * (configureManagedCollection mode)
 */
export async function getCurrentCollection(): Promise<CmsCollectionInfo | null> {
  try {
    // In configureManagedCollection mode, framer.activeCollection provides the current collection
    const activeCollection = await framer.getActiveManagedCollection();
    if (activeCollection) {
      return {
        id: activeCollection.id,
        name: activeCollection.name || "Untitled",
        slug: activeCollection.id,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get active collection:", error);
    return null;
  }
}

/**
 * Get all existing CMS collections
 */
export async function getCollections(): Promise<CmsCollectionInfo[]> {
  try {
    const collections = await framer.getManagedCollections();
    return collections.map((c) => ({
      id: c.id,
      name: c.name || "Untitled",
      slug: c.id, // ManagedCollection doesn't have slug, use id
    }));
  } catch (error) {
    console.error("Failed to get collections:", error);
    return [];
  }
}

/**
 * Find a collection by name
 */
export async function findCollectionByName(
  name: string
): Promise<CmsCollectionInfo | null> {
  const collections = await getCollections();
  const normalizedName = name.toLowerCase().trim();

  return (
    collections.find(
      (c) =>
        c.name.toLowerCase() === normalizedName ||
        c.slug.toLowerCase() === normalizedName
    ) || null
  );
}

/**
 * Create a new CMS collection for pages
 */
export async function createPageCollection(
  name: string,
  options: CmsOptions
): Promise<{ collection: CmsCollectionInfo | null; result: OperationResult }> {
  try {
    // Check if collection already exists
    const existing = await findCollectionByName(name);
    if (existing) {
      return {
        collection: existing,
        result: {
          type: "create_collection",
          nodeId: "collection",
          nodeName: name,
          nodePath: "/",
          success: true,
          details: `Using existing collection: ${existing.id}`,
        },
      };
    }

    // createManagedCollection takes just the name string
    const collection = await framer.createManagedCollection(name);

    if (!collection) {
      throw new Error("Collection creation returned null");
    }

    // Set up fields on the collection
    const fields: Parameters<ManagedCollection["setFields"]>[0] = [
      { id: "title", name: "Title", type: "string" },
      { id: "slug", name: "Slug", type: "string" },
      { id: "path", name: "Path", type: "string" },
      { id: "parentPath", name: "Parent Path", type: "string" },
      { id: "depth", name: "Depth", type: "number" },
    ];

    if (options.includeSeoTitle) {
      fields.push({ id: "seoTitle", name: "SEO Title", type: "string" });
    }
    if (options.includeDescription) {
      fields.push({ id: "description", name: "Description", type: "string" });
    }
    if (options.includeOrder) {
      fields.push({ id: "order", name: "Order", type: "number" });
    }

    try {
      await collection.setFields(fields);
    } catch (e) {
      console.warn("Could not set collection fields:", e);
    }

    return {
      collection: {
        id: collection.id,
        name: collection.name || name,
        slug: collection.id, // ManagedCollection doesn't have slug, use id
      },
      result: {
        type: "create_collection",
        nodeId: "collection",
        nodeName: name,
        nodePath: "/",
        success: true,
        details: `Created collection with ID: ${collection.id}`,
      },
    };
  } catch (error) {
    return {
      collection: null,
      result: {
        type: "create_collection",
        nodeId: "collection",
        nodeName: name,
        nodePath: "/",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Get items in a collection
 * Note: ManagedCollection only provides getItemIds(), not full item data.
 * We return item IDs as a basic reference for existence checks.
 */
export async function getCollectionItems(
  collectionId: string
): Promise<CmsItem[]> {
  try {
    const collections = await framer.getManagedCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return [];

    // ManagedCollection only has getItemIds, not getItems
    const itemIds = await collection.getItemIds();
    return itemIds.map((id) => ({
      id,
      slug: undefined,
      fieldData: {},
    }));
  } catch (error) {
    console.error("Failed to get collection items:", error);
    return [];
  }
}

/**
 * Find existing CMS item by path
 */
export async function findItemByPath(
  collectionId: string,
  path: string
): Promise<CmsItem | null> {
  const items = await getCollectionItems(collectionId);

  return (
    items.find(
      (item) =>
        item.fieldData.path === path ||
        item.slug === path.replace(/^\//, "").replace(/\//g, "-")
    ) || null
  );
}

/**
 * Create a CMS item for a page node
 */
export async function createCmsItem(
  collectionId: string,
  node: PageNode,
  options: CmsOptions
): Promise<OperationResult> {
  try {
    // Check if item already exists
    const existing = await findItemByPath(collectionId, node.fullPath);
    if (existing) {
      if (options.updateExisting) {
        return updateCmsItem(collectionId, existing.id, node, options);
      }
      return {
        type: "skip_cms_item",
        nodeId: node.id,
        nodeName: node.name,
        nodePath: node.fullPath,
        success: true,
        details: `Item already exists with ID: ${existing.id}`,
      };
    }

    // Get the collection
    const collections = await framer.getManagedCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    // Get the collection's existing fields
    const existingFields = await collection.getFields();
    const fieldIds = new Set(existingFields.map(f => f.id));

    // Build slug from the item's own slug, not full path
    const itemSlug = node.slug === "/" ? "home" : node.slug;

    // Build field data - only include fields that exist in the collection
    const fieldData: import("framer-plugin").FieldDataInput = {};

    // Try common field names for the title/name
    if (fieldIds.has("title")) {
      fieldData.title = { type: "string", value: node.name };
    } else if (fieldIds.has("name")) {
      fieldData.name = { type: "string", value: node.name };
    }

    // Add optional fields if they exist in the collection
    if (fieldIds.has("path")) {
      fieldData.path = { type: "string", value: node.fullPath };
    }
    if (fieldIds.has("parentPath")) {
      fieldData.parentPath = { type: "string", value: node.parentFullPath || "" };
    }
    if (fieldIds.has("depth")) {
      fieldData.depth = { type: "number", value: node.fullPath.split("/").filter(Boolean).length };
    }
    if (options.includeSeoTitle && node.seoTitle && fieldIds.has("seoTitle")) {
      fieldData.seoTitle = { type: "string", value: node.seoTitle };
    }
    if (options.includeDescription && node.description && fieldIds.has("description")) {
      fieldData.description = { type: "string", value: node.description };
    }
    if (options.includeOrder && node.order !== undefined && fieldIds.has("order")) {
      fieldData.order = { type: "number", value: node.order };
    }

    // Add item to collection - slug is a built-in property, not a field
    await collection.addItems([
      {
        id: node.id,
        slug: itemSlug,
        draft: false,
        fieldData,
      },
    ]);

    return {
      type: "create_cms_item",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: true,
      details: `Created item: ${itemSlug}`,
    };
  } catch (error) {
    return {
      type: "create_cms_item",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update an existing CMS item
 */
export async function updateCmsItem(
  collectionId: string,
  itemId: string,
  node: PageNode,
  options: CmsOptions
): Promise<OperationResult> {
  try {
    const collections = await framer.getManagedCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    // Get the collection's existing fields
    const existingFields = await collection.getFields();
    const fieldIds = new Set(existingFields.map(f => f.id));

    // Build slug from the item's own slug, not full path
    const itemSlug = node.slug === "/" ? "home" : node.slug;

    // Build field data - only include fields that exist in the collection
    const fieldData: import("framer-plugin").FieldDataInput = {};

    // Try common field names for the title/name
    if (fieldIds.has("title")) {
      fieldData.title = { type: "string", value: node.name };
    } else if (fieldIds.has("name")) {
      fieldData.name = { type: "string", value: node.name };
    }

    // Add optional fields if they exist in the collection
    if (fieldIds.has("path")) {
      fieldData.path = { type: "string", value: node.fullPath };
    }
    if (fieldIds.has("parentPath")) {
      fieldData.parentPath = { type: "string", value: node.parentFullPath || "" };
    }
    if (fieldIds.has("depth")) {
      fieldData.depth = { type: "number", value: node.fullPath.split("/").filter(Boolean).length };
    }
    if (options.includeSeoTitle && node.seoTitle && fieldIds.has("seoTitle")) {
      fieldData.seoTitle = { type: "string", value: node.seoTitle };
    }
    if (options.includeDescription && node.description && fieldIds.has("description")) {
      fieldData.description = { type: "string", value: node.description };
    }
    if (options.includeOrder && node.order !== undefined && fieldIds.has("order")) {
      fieldData.order = { type: "number", value: node.order };
    }

    // Update item by adding it again with the same ID
    await collection.addItems([
      {
        id: itemId,
        slug: itemSlug,
        draft: false,
        fieldData,
      },
    ]);

    return {
      type: "update_cms_item",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: true,
      details: `Updated item ${itemId}`,
    };
  } catch (error) {
    return {
      type: "update_cms_item",
      nodeId: node.id,
      nodeName: node.name,
      nodePath: node.fullPath,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create CMS items for multiple nodes
 */
export async function createCmsItems(
  collectionId: string,
  nodes: PageNode[],
  options: CmsOptions,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<OperationResult[]> {
  const results: OperationResult[] = [];

  // Sort nodes by depth (parents first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const depthA = a.fullPath.split("/").filter(Boolean).length;
    const depthB = b.fullPath.split("/").filter(Boolean).length;
    return depthA - depthB;
  });

  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    onProgress?.(i, sortedNodes.length, node.name);

    const result = await createCmsItem(collectionId, node, options);
    results.push(result);

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  onProgress?.(sortedNodes.length, sortedNodes.length, "Complete");

  return results;
}

/**
 * Create CMS template page binding (limited API support)
 */
export async function setupCmsTemplate(
  collectionId: string,
  templatePageId?: string
): Promise<OperationResult> {
  return {
    type: "skip_page",
    nodeId: "cms-template",
    nodeName: "CMS Template",
    nodePath: "/[slug]",
    success: true,
    details: templatePageId
      ? `CMS template binding requires manual setup. Bind page ${templatePageId} to collection ${collectionId} in Framer.`
      : "CMS collection created. Manually create a CMS page template in Framer.",
  };
}
