/**
 * Framer API module exports
 */

export {
  getExistingPages,
  pageExists,
  createPage,
  updatePage,
  createPages,
  getTemplateCandidates,
  getTemplateBreakpoints,
  clearTemplateCache,
} from "./pages";

export {
  getCollections,
  findCollectionByName,
  createPageCollection,
  getCollectionItems,
  findItemByPath,
  createCmsItem,
  updateCmsItem,
  createCmsItems,
  setupCmsTemplate,
} from "./cms";
