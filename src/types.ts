/**
 * Core type definitions for the Framer Page Importer Plugin
 */

// Page type classification
export type PageType = "static" | "cms-hub" | "cms-template" | "cms-item";

// Normalized page node representing a single page in the tree
export interface PageNode {
  id: string; // stable hash of fullPath
  name: string; // required - display name
  slug: string; // required - single segment like "solutions" or "/" for root
  fullPath: string; // computed - full path like "/solutions/commercial-hvac"
  parentFullPath?: string; // undefined for root
  order?: number;
  seoTitle?: string;
  description?: string;
  sourceType?: string; // original type from CSV/XML (e.g., "Static Page", "CMS Hub")
  pageType: PageType; // computed classification
  cmsCollectionName?: string; // for CMS hubs: the collection name
  children: PageNode[];
}

// Raw CSV row before normalization
export interface CsvRow {
  name: string;
  slug: string;
  type?: string;
  complexity?: string;
  serviceType?: string;
  parentPage?: string;
  depth?: number;
  cost?: string;
}

// Raw XML page data before normalization
export interface XmlPageData {
  name: string;
  slug: string;
  depth?: number;
  type?: string;
  complexity?: string;
  serviceType?: string;
  description?: string;
  seoTitle?: string;
  cost?: string;
  order?: number;
  children: XmlPageData[];
}

// Validation error types
export type ValidationErrorType =
  | "duplicate_fullpath"
  | "duplicate_name"
  | "missing_parent"
  | "empty_name"
  | "empty_slug"
  | "invalid_slug_chars"
  | "circular_reference"
  | "multiple_roots";

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  nodeId?: string;
  nodeName?: string;
  nodePath?: string;
  relatedNodeId?: string;
  relatedNodePath?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Parse result wrapper
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Generation options for static pages
export interface StaticPageOptions {
  enabled: boolean;
  templatePageId?: string; // Framer page ID to use as template
  selectedNodeIds: Set<string>; // Which nodes to create pages for (empty = all)
  skipExisting: boolean; // Skip if page with same route exists
  updateExisting: boolean; // Update existing pages instead of skip
}

// Generation options for CMS
export interface CmsOptions {
  enabled: boolean;
  collectionName: string;
  selectedCollectionName?: string; // Which detected collection to import (from XML/CSV)
  selectedNodeIds: Set<string>; // Which nodes to create CMS items for (empty = all)
  includeDescription: boolean;
  includeSeoTitle: boolean;
  includeOrder: boolean;
  templatePageId?: string; // CMS detail template page
  updateExisting: boolean; // Update existing items by path
}

// Combined generation configuration
export interface GenerationConfig {
  staticPages: StaticPageOptions;
  cms: CmsOptions;
}

// Progress tracking
export type OperationType = "create_page" | "update_page" | "skip_page" | "create_cms_item" | "update_cms_item" | "skip_cms_item" | "create_collection";

export interface OperationResult {
  type: OperationType;
  nodeId: string;
  nodeName: string;
  nodePath: string;
  success: boolean;
  error?: string;
  details?: string;
}

export interface GenerationProgress {
  total: number;
  completed: number;
  currentOperation: string;
  results: OperationResult[];
}

export interface GenerationSummary {
  pagesCreated: number;
  pagesUpdated: number;
  pagesSkipped: number;
  cmsItemsCreated: number;
  cmsItemsUpdated: number;
  cmsItemsSkipped: number;
  collectionCreated: boolean;
  errors: OperationResult[];
  duration: number;
}

// UI State
export type ImportMode = "static" | "cms";
export type PluginStep = "mode" | "upload" | "preview" | "configure" | "generate" | "results";

export interface PluginState {
  step: PluginStep;
  fileType: "csv" | "xml" | null;
  fileName: string | null;
  rawContent: string | null;
  pageTree: PageNode[];
  flatNodes: Map<string, PageNode>;
  validation: ValidationResult;
  config: GenerationConfig;
  progress: GenerationProgress | null;
  summary: GenerationSummary | null;
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

// Framer API types (simplified representations)
export interface FramerPage {
  id: string;
  name: string;
  path: string;
}

export interface FramerCmsCollection {
  id: string;
  name: string;
  slug: string;
}

export interface FramerCmsItem {
  id: string;
  fieldData: Record<string, unknown>;
}

export interface FramerCmsField {
  id: string;
  name: string;
  type: "string" | "number" | "boolean" | "image" | "link" | "color" | "date";
}
