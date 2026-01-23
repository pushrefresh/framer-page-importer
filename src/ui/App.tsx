/**
 * Main App component for the Framer Page Importer plugin
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { framer } from "framer-plugin";
import type {
  PageNode,
  PluginStep,
  ImportMode,
  GenerationConfig,
  GenerationProgress,
  GenerationSummary,
  ValidationResult,
  OperationResult,
} from "../types";
import {
  parseCsv,
  parseXml,
  isCsvContent,
  isXmlContent,
  normalizeFromCsv,
  normalizeFromXml,
  validateTree,
  hasBlockingErrors,
  flattenTree,
  countNodes,
  normalizeSlug,
  computeFullPath,
  generateNodeId,
  getClassificationSummary,
} from "../parsers";
import type { ClassificationSummary } from "../parsers";
import { createPages } from "../framer/pages";
import { getCurrentCollection, createCmsItems, setupCmsTemplate } from "../framer/cms";
import {
  FileUpload,
  ModeSelector,
  TreeView,
  ValidationPanel,
  ConfigPanel,
  ProgressPanel,
  ResultsSummary,
  LogPanel,
  useLogs,
  styles,
  colors,
  spacing,
} from "./index";

const defaultConfig: GenerationConfig = {
  staticPages: {
    enabled: true,
    selectedNodeIds: new Set(),
    skipExisting: true,
    updateExisting: false,
  },
  cms: {
    enabled: false,
    collectionName: "Imported Pages",
    selectedNodeIds: new Set(),
    includeDescription: true,
    includeSeoTitle: true,
    includeOrder: true,
    updateExisting: false,
  },
};

export const App: React.FC = () => {
  // Mode detection - CMS operations only work in configureManagedCollection mode
  const [pluginMode, setPluginMode] = useState<string>("canvas");

  useEffect(() => {
    // Detect the current plugin mode
    const detectMode = async () => {
      try {
        // framer.mode contains the current plugin mode
        const mode = framer.mode;
        setPluginMode(mode || "canvas");
      } catch {
        setPluginMode("canvas");
      }
    };
    detectMode();
  }, []);

  const isCmsEnabled = pluginMode === "configureManagedCollection";

  // Core state
  const [step, setStep] = useState<PluginStep>("mode");
  const [importMode, setImportMode] = useState<ImportMode | null>(null);
  const [, setFileType] = useState<"csv" | "xml" | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pageTree, setPageTree] = useState<PageNode[]>([]);
  const [flatNodes, setFlatNodes] = useState<Map<string, PageNode>>(new Map());
  const [validation, setValidation] = useState<ValidationResult>({
    valid: true,
    errors: [],
    warnings: [],
  });
  const [config, setConfig] = useState<GenerationConfig>(defaultConfig);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [summary, setSummary] = useState<GenerationSummary | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  // Logging
  const logger = useLogs();

  // Computed values
  const classificationSummary = useMemo<ClassificationSummary | undefined>(
    () => pageTree.length > 0 ? getClassificationSummary(pageTree) : undefined,
    [pageTree]
  );

  // Filter the tree based on the import mode
  // Static mode: show static + cms-hub pages
  // CMS mode: show cms-item pages only
  const filteredTree = useMemo(() => {
    if (!importMode || pageTree.length === 0) return pageTree;

    const filterNodes = (nodes: PageNode[]): PageNode[] => {
      const result: PageNode[] = [];
      for (const node of nodes) {
        if (importMode === "static") {
          // Include static and cms-hub pages
          if (node.pageType === "static" || node.pageType === "cms-hub") {
            // Include this node, but filter its children too
            result.push({
              ...node,
              children: filterNodes(node.children),
            });
          } else {
            // Check if any descendants should be included
            const filteredChildren = filterNodes(node.children);
            if (filteredChildren.length > 0) {
              // Don't include the parent but include the filtered children at this level
              result.push(...filteredChildren);
            }
          }
        } else {
          // CMS mode - only include cms-item pages
          if (node.pageType === "cms-item") {
            result.push({
              ...node,
              children: [], // CMS items are flat in the UI
            });
          } else {
            // Check children
            const filteredChildren = filterNodes(node.children);
            result.push(...filteredChildren);
          }
        }
      }
      return result;
    };

    return filterNodes(pageTree);
  }, [pageTree, importMode]);

  const filteredNodeCount = useMemo(() => countNodes(filteredTree), [filteredTree]);
  const hasValidationErrors = useMemo(
    () => hasBlockingErrors(validation),
    [validation]
  );
  const canGenerate = useMemo(
    () =>
      !hasValidationErrors &&
      importMode !== null &&
      filteredNodeCount > 0,
    [hasValidationErrors, importMode, filteredNodeCount]
  );

  // File upload handler
  const handleFileSelect = useCallback(
    (file: File, content: string) => {
      logger.info(`Uploaded file: ${file.name}`);
      setFileName(file.name);

      // Detect file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isCsv = ext === "csv" || isCsvContent(content);
      const isXml = ext === "xml" || isXmlContent(content);

      if (!isCsv && !isXml) {
        logger.error("Could not detect file format. Please use CSV or XML.");
        return;
      }

      setFileType(isCsv ? "csv" : "xml");

      // Parse the file
      let parseResult;
      let normalizeResult;

      if (isCsv) {
        logger.info("Parsing as CSV...");
        parseResult = parseCsv(content);
        if (!parseResult.success || !parseResult.data) {
          logger.error(`CSV parse error: ${parseResult.error}`);
          return;
        }
        if (parseResult.warnings) {
          parseResult.warnings.forEach((w) => logger.warn(w));
        }
        parseResult.data.warnings.forEach((w) => logger.warn(w));

        logger.info(`Parsed ${parseResult.data.rows.length} rows`);
        normalizeResult = normalizeFromCsv(parseResult.data.rows);
      } else {
        logger.info("Parsing as XML...");
        parseResult = parseXml(content);
        if (!parseResult.success || !parseResult.data) {
          logger.error(`XML parse error: ${parseResult.error}`);
          return;
        }
        if (parseResult.warnings) {
          parseResult.warnings.forEach((w) => logger.warn(w));
        }
        parseResult.data.warnings.forEach((w) => logger.warn(w));

        logger.info(`Parsed ${parseResult.data.pages.length} root page(s)`);
        normalizeResult = normalizeFromXml(parseResult.data.pages);
      }

      if (!normalizeResult.success || !normalizeResult.data) {
        logger.error(`Normalization error: ${normalizeResult.error}`);
        return;
      }

      const { tree, flatMap, warnings } = normalizeResult.data;
      warnings.forEach((w) => logger.warn(w));

      setPageTree(tree);
      setFlatNodes(flatMap);

      // Select only relevant nodes based on import mode
      const relevantNodeIds = new Set<string>();
      const walkForSelection = (nodes: PageNode[]) => {
        for (const node of nodes) {
          if (importMode === "static") {
            // Static mode: select static + cms-hub pages
            if (node.pageType === "static" || node.pageType === "cms-hub") {
              relevantNodeIds.add(node.id);
            }
          } else {
            // CMS mode: select only cms-item pages
            if (node.pageType === "cms-item") {
              relevantNodeIds.add(node.id);
            }
          }
          if (node.children.length > 0) {
            walkForSelection(node.children);
          }
        }
      };
      walkForSelection(tree);
      setSelectedNodeIds(relevantNodeIds);

      // Validate
      const validationResult = validateTree(tree);
      setValidation(validationResult);

      if (validationResult.errors.length > 0) {
        logger.error(`Found ${validationResult.errors.length} validation errors`);
      }
      if (validationResult.warnings.length > 0) {
        logger.warn(`Found ${validationResult.warnings.length} warnings`);
      }

      logger.success(`Loaded ${countNodes(tree)} pages`);

      // Log classification summary for debugging
      const summary = getClassificationSummary(tree);
      logger.info(`Found ${summary.staticCount + summary.cmsHubs.length} static pages, ${summary.totalCmsItems} CMS items`);
      if (summary.cmsHubs.length > 0) {
        summary.cmsHubs.forEach(hub => {
          logger.info(`  - ${hub.collectionName}: ${hub.itemCount} items`);
        });
      }

      setStep("preview");
    },
    [logger, importMode]
  );

  // Toggle node selection
  const handleToggleSelect = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Select/deselect all
  const handleSelectAll = useCallback(() => {
    setSelectedNodeIds(new Set(flatNodes.keys()));
  }, [flatNodes]);

  const handleDeselectAll = useCallback(() => {
    setSelectedNodeIds(new Set());
  }, []);

  // Edit slug handler
  const handleEditSlug = useCallback(
    (nodeId: string, newSlug: string) => {
      const node = flatNodes.get(nodeId);
      if (!node) return;

      // Normalize the new slug
      const isRoot = node.fullPath === "/";
      const normalizedSlug = normalizeSlug(newSlug, isRoot);

      // Compute new fullPath
      const newFullPath = isRoot
        ? "/"
        : computeFullPath(node.parentFullPath, normalizedSlug);

      // Update the node and all descendants
      const updateNodeAndDescendants = (
        tree: PageNode[],
        targetId: string,
        newSlug: string,
        newPath: string
      ): PageNode[] => {
        return tree.map((n) => {
          if (n.id === targetId) {
            const updatedNode: PageNode = {
              ...n,
              slug: newSlug,
              fullPath: newPath,
              id: generateNodeId(newPath),
              children: updateChildPaths(n.children, n.fullPath, newPath),
            };
            return updatedNode;
          }
          if (n.children.length > 0) {
            return {
              ...n,
              children: updateNodeAndDescendants(
                n.children,
                targetId,
                newSlug,
                newPath
              ),
            };
          }
          return n;
        });
      };

      const updateChildPaths = (
        children: PageNode[],
        oldParentPath: string,
        newParentPath: string
      ): PageNode[] => {
        return children.map((child) => {
          const newChildPath = child.fullPath.replace(
            oldParentPath,
            newParentPath
          );
          return {
            ...child,
            fullPath: newChildPath,
            parentFullPath: newParentPath,
            id: generateNodeId(newChildPath),
            children: updateChildPaths(
              child.children,
              child.fullPath,
              newChildPath
            ),
          };
        });
      };

      const newTree = updateNodeAndDescendants(
        pageTree,
        nodeId,
        normalizedSlug,
        newFullPath
      );
      setPageTree(newTree);

      // Rebuild flat map
      const newFlatMap = new Map<string, PageNode>();
      const walk = (nodes: PageNode[]) => {
        for (const n of nodes) {
          newFlatMap.set(n.id, n);
          if (n.children.length > 0) walk(n.children);
        }
      };
      walk(newTree);
      setFlatNodes(newFlatMap);

      // Update selection (IDs changed)
      setSelectedNodeIds((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (newFlatMap.has(id)) {
            next.add(id);
          }
        }
        // Add the new node ID
        if (prev.has(nodeId)) {
          const newNode = Array.from(newFlatMap.values()).find(
            (n) => n.fullPath === newFullPath
          );
          if (newNode) next.add(newNode.id);
        }
        return next;
      });

      // Re-validate
      const newValidation = validateTree(newTree);
      setValidation(newValidation);

      logger.info(`Updated slug for "${node.name}" to "${normalizedSlug}"`);
    },
    [flatNodes, pageTree, logger]
  );

  // Run generation
  const handleGenerate = useCallback(async () => {
    setStep("generate");
    setSummary(null);

    const startTime = Date.now();
    const results: OperationResult[] = [];
    let collectionId: string | null = null;

    // Get all nodes (flattened)
    const allNodes = flattenTree(pageTree);

    // Filter by selection if any
    const selectedNodes =
      selectedNodeIds.size > 0
        ? allNodes.filter((n) => selectedNodeIds.has(n.id))
        : allNodes;

    // For static pages: include "static" pages AND "cms-hub" pages
    // (CMS hubs are real index/listing pages that should be created in Framer)
    const staticNodesToProcess = selectedNodes.filter(
      (n) => n.pageType === "static" || n.pageType === "cms-hub"
    );

    // For CMS: only include pages with pageType === "cms-item"
    // Optionally filter by selected collection
    let cmsNodesToProcess = selectedNodes.filter(
      (n) => n.pageType === "cms-item"
    );
    if (config.cms.selectedCollectionName) {
      cmsNodesToProcess = cmsNodesToProcess.filter(
        (n) => n.cmsCollectionName === config.cms.selectedCollectionName
      );
    }

    const cmsWillRun = config.cms.enabled && isCmsEnabled;
    const totalOperations =
      (config.staticPages.enabled ? staticNodesToProcess.length : 0) +
      (cmsWillRun ? cmsNodesToProcess.length : 0);

    setProgress({
      total: totalOperations,
      completed: 0,
      currentOperation: "Starting...",
      results: [],
    });

    logger.info("Starting generation...");

    // Get current CMS collection if in CMS mode (plugin opened from a collection)
    if (config.cms.enabled && isCmsEnabled) {
      logger.info("Getting current CMS collection...");
      setProgress((p) => ({
        ...p!,
        currentOperation: "Connecting to collection...",
      }));

      const currentCollection = await getCurrentCollection();

      if (currentCollection) {
        collectionId = currentCollection.id;
        logger.success(`Connected to collection: ${currentCollection.name}`);
      } else {
        logger.error("Failed to get current collection. Make sure the plugin is opened from a CMS collection.");
      }
    }

    // Create static pages (only pages with pageType === "static")
    if (config.staticPages.enabled && staticNodesToProcess.length > 0) {
      logger.info(`Creating ${staticNodesToProcess.length} static pages...`);

      const pageResults = await createPages(staticNodesToProcess, {
        templatePageId: config.staticPages.templatePageId,
        skipExisting: config.staticPages.skipExisting,
        updateExisting: config.staticPages.updateExisting,
        onProgress: (completed, _total, current) => {
          setProgress((p) => ({
            ...p!,
            completed: completed,
            currentOperation: `Creating page: ${current}`,
          }));
        },
      });

      for (const result of pageResults) {
        results.push(result);
        setProgress((p) => ({
          ...p!,
          results: [...p!.results, result],
        }));

        if (result.success) {
          if (result.type === "create_page") {
            logger.success(`Created page: ${result.nodeName}`);
          } else if (result.type === "update_page") {
            logger.info(`Updated page: ${result.nodeName}`);
          } else {
            logger.info(`Skipped page: ${result.nodeName}`);
          }
        } else {
          logger.error(`Failed: ${result.nodeName} - ${result.error}`);
        }
      }
    }

    // Create CMS items (only pages with pageType === "cms-item")
    if (config.cms.enabled && isCmsEnabled && collectionId && cmsNodesToProcess.length > 0) {
      logger.info(`Creating ${cmsNodesToProcess.length} CMS items...`);

      const cmsResults = await createCmsItems(
        collectionId,
        cmsNodesToProcess,
        config.cms,
        (completed, _total, current) => {
          setProgress((p) => ({
            ...p!,
            completed:
              (config.staticPages.enabled ? staticNodesToProcess.length : 0) +
              completed,
            currentOperation: `Creating CMS item: ${current}`,
          }));
        }
      );

      for (const result of cmsResults) {
        results.push(result);
        setProgress((p) => ({
          ...p!,
          results: [...p!.results, result],
        }));

        if (result.success) {
          if (result.type === "create_cms_item") {
            logger.success(`Created CMS item: ${result.nodeName}`);
          } else if (result.type === "update_cms_item") {
            logger.info(`Updated CMS item: ${result.nodeName}`);
          } else {
            logger.info(`Skipped CMS item: ${result.nodeName}`);
          }
        } else {
          logger.error(`Failed: ${result.nodeName} - ${result.error}`);
        }
      }

      // Setup CMS template if specified
      if (config.cms.templatePageId) {
        const templateResult = await setupCmsTemplate(
          collectionId,
          config.cms.templatePageId
        );
        results.push(templateResult);
        if (templateResult.success) {
          logger.info(templateResult.details || "CMS template setup complete");
        }
      }
    }

    // Calculate summary
    const duration = Date.now() - startTime;
    const summaryData: GenerationSummary = {
      pagesCreated: results.filter(
        (r) => r.type === "create_page" && r.success
      ).length,
      pagesUpdated: results.filter(
        (r) => r.type === "update_page" && r.success
      ).length,
      pagesSkipped: results.filter(
        (r) => r.type === "skip_page" && r.success
      ).length,
      cmsItemsCreated: results.filter(
        (r) => r.type === "create_cms_item" && r.success
      ).length,
      cmsItemsUpdated: results.filter(
        (r) => r.type === "update_cms_item" && r.success
      ).length,
      cmsItemsSkipped: results.filter(
        (r) => r.type === "skip_cms_item" && r.success
      ).length,
      collectionCreated: false, // We use existing collection in CMS mode
      errors: results.filter((r) => !r.success),
      duration,
    };

    setSummary(summaryData);
    setProgress((p) => ({
      ...p!,
      completed: totalOperations,
      currentOperation: "Complete",
    }));

    logger.success(`Generation complete in ${(duration / 1000).toFixed(1)}s`);
    setStep("results");
  }, [config, pageTree, selectedNodeIds, logger, isCmsEnabled]);

  // Reset to start over
  const handleReset = useCallback(() => {
    setStep("mode");
    setImportMode(null);
    setFileType(null);
    setFileName(null);
    setPageTree([]);
    setFlatNodes(new Map());
    setValidation({ valid: true, errors: [], warnings: [] });
    setConfig(defaultConfig);
    setSelectedNodeIds(new Set());
    setProgress(null);
    setSummary(null);
    logger.clear();
  }, [logger]);

  // Mode selection handler
  const handleSelectMode = useCallback((mode: ImportMode) => {
    setImportMode(mode);
    // Auto-configure based on mode
    setConfig({
      ...defaultConfig,
      staticPages: {
        ...defaultConfig.staticPages,
        enabled: mode === "static",
      },
      cms: {
        ...defaultConfig.cms,
        enabled: mode === "cms",
      },
    });
    logger.info(`Selected import mode: ${mode === "static" ? "Static Pages" : "CMS Items"}`);
    setStep("upload");
  }, [logger]);

  // Navigation helpers
  const goToMode = () => setStep("mode");
  const goToPreview = () => setStep("preview");
  const goToConfigure = () => setStep("configure");

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Page Importer</h1>
        <p style={styles.subtitle}>
          {step === "mode" && "What would you like to import?"}
          {step === "upload" && `Upload a CSV or XML file for ${importMode === "static" ? "static pages" : "CMS items"}`}
          {step === "preview" && fileName && `Previewing: ${fileName} (${filteredNodeCount} ${importMode === "static" ? "pages" : "items"})`}
          {step === "configure" && `Configure ${importMode === "static" ? "page" : "CMS"} options`}
          {step === "generate" && "Generating..."}
          {step === "results" && "Generation complete"}
        </p>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Mode Selection Step */}
        {step === "mode" && (
          <div style={styles.section}>
            <ModeSelector
              onSelectMode={handleSelectMode}
              isCmsAvailable={isCmsEnabled}
            />
          </div>
        )}

        {/* Upload Step */}
        {step === "upload" && (
          <div style={styles.section}>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        )}

        {/* Preview Step */}
        {step === "preview" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                {importMode === "static" ? "Static Pages" : "CMS Items"} ({filteredNodeCount} {importMode === "static" ? "pages" : "items"})
              </div>
              <TreeView
                nodes={filteredTree}
                selectedIds={selectedNodeIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onEditSlug={handleEditSlug}
              />
              {importMode === "static" && classificationSummary && classificationSummary.cmsHubs.length > 0 && (
                <div style={{ marginTop: spacing.md, fontSize: 12, color: colors.textSecondary }}>
                  Includes {classificationSummary.cmsHubs.length} CMS index page{classificationSummary.cmsHubs.length !== 1 ? "s" : ""} (hub pages)
                </div>
              )}
              {importMode === "cms" && classificationSummary && classificationSummary.cmsHubs.length > 0 && (
                <div style={{ marginTop: spacing.md, fontSize: 12, color: colors.textSecondary }}>
                  From {classificationSummary.cmsHubs.length} collection{classificationSummary.cmsHubs.length !== 1 ? "s" : ""}:{" "}
                  {classificationSummary.cmsHubs.map(h => h.collectionName).join(", ")}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Validation</div>
              <ValidationPanel validation={validation} />
            </div>
          </>
        )}

        {/* Configure Step */}
        {step === "configure" && importMode && (
          <ConfigPanel
            config={config}
            onChange={setConfig}
            nodeCount={filteredNodeCount}
            selectedCount={selectedNodeIds.size}
            importMode={importMode}
            classificationSummary={classificationSummary}
          />
        )}

        {/* Generate Step */}
        {step === "generate" && progress && (
          <ProgressPanel progress={progress} />
        )}

        {/* Results Step */}
        {step === "results" && summary && (
          <ResultsSummary
            summary={summary}
            onReset={handleReset}
            onViewLogs={() => setShowLogs(!showLogs)}
          />
        )}

        {/* Logs (toggle-able) */}
        {showLogs && (
          <div style={{ ...styles.section, marginTop: spacing.lg }}>
            <div style={styles.sectionTitle}>Logs</div>
            <LogPanel logs={logger.logs} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        {step === "upload" && (
          <button
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
            }}
            onClick={goToMode}
          >
            Back
          </button>
        )}

        {step === "preview" && (
          <>
            <button
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
              }}
              onClick={handleReset}
            >
              Start Over
            </button>
            <button
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(hasValidationErrors ? styles.buttonDisabled : {}),
              }}
              onClick={goToConfigure}
              disabled={hasValidationErrors}
            >
              {hasValidationErrors ? "Fix Errors First" : "Continue"}
            </button>
          </>
        )}

        {step === "configure" && (
          <>
            <button
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
              }}
              onClick={goToPreview}
            >
              Back
            </button>
            <button
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(!canGenerate ? styles.buttonDisabled : {}),
              }}
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              Generate
            </button>
          </>
        )}

        {step === "generate" && (
          <button
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              ...styles.buttonDisabled,
            }}
            disabled
          >
            Please wait...
          </button>
        )}
      </div>
    </div>
  );
};
