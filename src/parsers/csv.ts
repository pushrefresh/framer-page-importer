/**
 * CSV Parser for page tree import
 *
 * Handles the tricky case where Cost field contains unquoted commas (e.g., "$4,000")
 * which causes naive CSV parsers to split incorrectly.
 */

import Papa from "papaparse";
import type { CsvRow, ParseResult } from "../types";

const EXPECTED_COLUMN_COUNT = 8;

// Normalize header names for matching
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Map of normalized headers to our internal field names
const HEADER_MAP: Record<string, keyof CsvRow> = {
  name: "name",
  slug: "slug",
  type: "type",
  complexity: "complexity",
  servicetype: "serviceType",
  parentpage: "parentPage",
  depth: "depth",
  cost: "cost",
};

interface ParsedCsvData {
  rows: CsvRow[];
  warnings: string[];
}

/**
 * Parse CSV content with robust handling of comma-in-cost issue
 */
export function parseCsv(content: string): ParseResult<ParsedCsvData> {
  const warnings: string[] = [];

  try {
    // First, parse with PapaParse to get raw data
    const parseResult = Papa.parse<string[]>(content, {
      header: false,
      skipEmptyLines: true,
      transformHeader: undefined,
    });

    if (parseResult.errors.length > 0) {
      const criticalErrors = parseResult.errors.filter(
        (e) => e.type === "Quotes" || e.type === "FieldMismatch"
      );
      if (criticalErrors.length > 0) {
        warnings.push(
          `CSV parsing warnings: ${criticalErrors.map((e) => e.message).join("; ")}`
        );
      }
    }

    const rawData = parseResult.data;
    if (rawData.length < 2) {
      return {
        success: false,
        error: "CSV file must contain a header row and at least one data row",
      };
    }

    // Get header row
    const headerRow = rawData[0];

    // Build header index map
    const headerIndices: Map<keyof CsvRow, number> = new Map();
    for (let i = 0; i < headerRow.length && i < EXPECTED_COLUMN_COUNT; i++) {
      const normalizedHeader = normalizeHeader(headerRow[i]);
      const fieldName = HEADER_MAP[normalizedHeader];
      if (fieldName) {
        headerIndices.set(fieldName, i);
      }
    }

    // Validate required headers
    if (!headerIndices.has("name")) {
      return {
        success: false,
        error: 'CSV missing required "Name" column',
      };
    }
    if (!headerIndices.has("slug")) {
      return {
        success: false,
        error: 'CSV missing required "Slug" column',
      };
    }

    // Process data rows
    const rows: CsvRow[] = [];
    const costIndex = headerIndices.get("cost") ?? EXPECTED_COLUMN_COUNT - 1;

    for (let rowIndex = 1; rowIndex < rawData.length; rowIndex++) {
      const rawRow = rawData[rowIndex];

      // Skip empty rows
      if (rawRow.length === 0 || (rawRow.length === 1 && rawRow[0].trim() === "")) {
        continue;
      }

      // Handle rows with more columns than expected (comma in cost field)
      let processedRow = [...rawRow];
      if (rawRow.length > EXPECTED_COLUMN_COUNT) {
        // Re-join trailing columns back into cost field
        const costParts = rawRow.slice(costIndex);
        const costValue = costParts.join(",");
        processedRow = rawRow.slice(0, costIndex);
        processedRow.push(costValue);

        warnings.push(
          `Row ${rowIndex + 1}: Rejoined ${rawRow.length - EXPECTED_COLUMN_COUNT + 1} columns into Cost field`
        );
      }

      // Extract values
      const getValue = (field: keyof CsvRow): string => {
        const index = headerIndices.get(field);
        return index !== undefined && index < processedRow.length
          ? processedRow[index].trim()
          : "";
      };

      const name = getValue("name");
      const slug = getValue("slug");
      const parentPage = getValue("parentPage");
      const depthStr = getValue("depth");

      // Skip summary rows
      if (
        name.toLowerCase().includes("total pages") ||
        name.toLowerCase().includes("total cost") ||
        name.toLowerCase().includes("summary")
      ) {
        continue;
      }

      // Skip rows with blank slug (except if name is present, which might be root)
      if (!slug && !name) {
        continue;
      }

      const row: CsvRow = {
        name,
        slug,
        type: getValue("type"),
        complexity: getValue("complexity"),
        serviceType: getValue("serviceType"),
        parentPage,
        depth: depthStr ? parseInt(depthStr, 10) : undefined,
        cost: getValue("cost"),
      };

      rows.push(row);
    }

    if (rows.length === 0) {
      return {
        success: false,
        error: "No valid data rows found in CSV",
      };
    }

    return {
      success: true,
      data: { rows, warnings },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `CSV parsing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Detect if content is likely CSV format
 */
export function isCsvContent(content: string): boolean {
  const firstLine = content.trim().split("\n")[0];
  if (!firstLine) return false;

  // Check if first line contains expected CSV headers
  const normalizedFirstLine = firstLine.toLowerCase();
  const hasNameHeader = normalizedFirstLine.includes("name");
  const hasSlugHeader = normalizedFirstLine.includes("slug");
  const hasCommas = firstLine.includes(",");

  return hasCommas && (hasNameHeader || hasSlugHeader);
}
