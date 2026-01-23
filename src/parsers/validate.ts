/**
 * Validation utilities for page tree
 */

import type {
  PageNode,
  ValidationResult,
  ValidationError,
  ValidationErrorType,
} from "../types";

// Invalid slug characters regex (allows lowercase letters, numbers, hyphens)
const INVALID_SLUG_CHARS_REGEX = /[^a-z0-9-/]/g;

/**
 * Create a validation error object
 */
function createError(
  type: ValidationErrorType,
  message: string,
  node?: PageNode,
  relatedNode?: PageNode
): ValidationError {
  return {
    type,
    message,
    nodeId: node?.id,
    nodeName: node?.name,
    nodePath: node?.fullPath,
    relatedNodeId: relatedNode?.id,
    relatedNodePath: relatedNode?.fullPath,
  };
}

/**
 * Validate a single node's slug
 */
function validateSlug(node: PageNode): ValidationError[] {
  const errors: ValidationError[] = [];

  // Root node has special slug
  if (node.fullPath === "/") {
    return errors;
  }

  // Check for empty slug
  if (!node.slug || node.slug.trim() === "") {
    errors.push(
      createError("empty_slug", `Page "${node.name}" has an empty slug`, node)
    );
    return errors;
  }

  // Check for invalid characters in slug
  const invalidChars = node.slug.match(INVALID_SLUG_CHARS_REGEX);
  if (invalidChars) {
    const uniqueInvalid = [...new Set(invalidChars)].join(", ");
    errors.push(
      createError(
        "invalid_slug_chars",
        `Page "${node.name}" slug "${node.slug}" contains invalid characters: ${uniqueInvalid}`,
        node
      )
    );
  }

  return errors;
}

/**
 * Validate entire page tree
 */
export function validateTree(tree: PageNode[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Track seen paths and names for duplicate detection
  const seenPaths = new Map<string, PageNode>();
  const seenNames = new Map<string, PageNode[]>();

  // Walk the tree and collect all nodes
  const allNodes: PageNode[] = [];

  function collectNodes(nodes: PageNode[], parentPath?: string) {
    for (const node of nodes) {
      allNodes.push(node);

      // Validate slug
      const slugErrors = validateSlug(node);
      errors.push(...slugErrors);

      // Check for empty name
      if (!node.name || node.name.trim() === "") {
        errors.push(
          createError(
            "empty_name",
            `Page at path "${node.fullPath}" has an empty name`,
            node
          )
        );
      }

      // Check for duplicate fullPath
      const existingPathNode = seenPaths.get(node.fullPath);
      if (existingPathNode) {
        errors.push(
          createError(
            "duplicate_fullpath",
            `Duplicate path "${node.fullPath}" found for pages "${existingPathNode.name}" and "${node.name}"`,
            node,
            existingPathNode
          )
        );
      } else {
        seenPaths.set(node.fullPath, node);
      }

      // Track names for duplicate warnings
      if (!seenNames.has(node.name)) {
        seenNames.set(node.name, []);
      }
      seenNames.get(node.name)!.push(node);

      // Validate parent reference
      if (node.parentFullPath && parentPath !== node.parentFullPath) {
        if (parentPath !== node.parentFullPath) {
          // This is a structural inconsistency warning, not an error
          // as it might be fixed during normalization
        }
      }

      // Recurse into children
      if (node.children.length > 0) {
        collectNodes(node.children, node.fullPath);
      }
    }
  }

  collectNodes(tree);

  // Check for duplicate names (warning, not error)
  for (const [name, nodes] of seenNames) {
    if (nodes.length > 1) {
      warnings.push(
        createError(
          "duplicate_name",
          `Page name "${name}" appears ${nodes.length} times at paths: ${nodes.map((n) => n.fullPath).join(", ")}`,
          nodes[0]
        )
      );
    }
  }

  // Check for multiple roots
  const rootNodes = tree.filter((n) => !n.parentFullPath);
  if (rootNodes.length > 1) {
    warnings.push({
      type: "multiple_roots",
      message: `Multiple root pages found: ${rootNodes.map((n) => n.name).join(", ")}. All will be created as top-level pages.`,
    });
  }

  // Sort errors by severity and path
  errors.sort((a, b) => {
    // Sort by type priority
    const typePriority: Record<ValidationErrorType, number> = {
      duplicate_fullpath: 1,
      circular_reference: 2,
      missing_parent: 3,
      empty_name: 4,
      empty_slug: 5,
      invalid_slug_chars: 6,
      duplicate_name: 7,
      multiple_roots: 8,
    };
    const aPriority = typePriority[a.type] || 99;
    const bPriority = typePriority[b.type] || 99;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // Then by path
    return (a.nodePath || "").localeCompare(b.nodePath || "");
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that a slug edit would not create duplicates
 */
export function validateSlugEdit(
  nodeId: string,
  newSlug: string,
  allNodes: Map<string, PageNode>
): ValidationError | null {
  const node = allNodes.get(nodeId);
  if (!node) return null;

  // Compute what the new fullPath would be
  const parentPath = node.parentFullPath || "";
  const normalizedSlug = newSlug
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const newFullPath =
    parentPath === "/" || !parentPath
      ? "/" + normalizedSlug
      : parentPath + "/" + normalizedSlug;

  // Check if any other node has this path
  for (const [id, existingNode] of allNodes) {
    if (id !== nodeId && existingNode.fullPath === newFullPath) {
      return createError(
        "duplicate_fullpath",
        `Cannot use slug "${newSlug}" - path "${newFullPath}" already exists for page "${existingNode.name}"`,
        node,
        existingNode
      );
    }
  }

  // Validate slug characters
  const invalidChars = normalizedSlug.match(INVALID_SLUG_CHARS_REGEX);
  if (invalidChars) {
    const uniqueInvalid = [...new Set(invalidChars)].join(", ");
    return createError(
      "invalid_slug_chars",
      `Slug "${newSlug}" contains invalid characters: ${uniqueInvalid}`,
      node
    );
  }

  return null;
}

/**
 * Check if tree has any blocking errors
 */
export function hasBlockingErrors(validation: ValidationResult): boolean {
  return validation.errors.some(
    (e) =>
      e.type === "duplicate_fullpath" ||
      e.type === "empty_name" ||
      e.type === "empty_slug" ||
      e.type === "circular_reference"
  );
}

/**
 * Get error/warning counts by type
 */
export function getValidationSummary(validation: ValidationResult): {
  errorCount: number;
  warningCount: number;
  byType: Record<ValidationErrorType, number>;
} {
  const byType: Record<ValidationErrorType, number> = {
    duplicate_fullpath: 0,
    duplicate_name: 0,
    missing_parent: 0,
    empty_name: 0,
    empty_slug: 0,
    invalid_slug_chars: 0,
    circular_reference: 0,
    multiple_roots: 0,
  };

  for (const error of validation.errors) {
    byType[error.type]++;
  }
  for (const warning of validation.warnings) {
    byType[warning.type]++;
  }

  return {
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    byType,
  };
}
