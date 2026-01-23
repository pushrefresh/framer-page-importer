# Framer Page Importer Plugin

A Framer plugin for importing page trees from CSV or XML files and generating static Framer pages and/or CMS collections.

## Features

- **Import from CSV or XML**: Upload page structure files exported from sitemap tools
- **Visual Tree Preview**: See your page hierarchy before generating
- **Validation**: Catches duplicate paths, invalid slugs, and other issues
- **Static Page Generation**: Create actual pages in Framer's Pages panel
- **CMS Generation**: Create CMS collections and items for dynamic content
- **Template Support**: Clone existing pages as templates for new pages
- **Idempotent Operations**: Skip or update existing pages to avoid duplicates

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:

```bash
npm run dev
```

This will start Vite's dev server with hot reload. To test the plugin:

1. Open Framer
2. Go to Plugins > Development > Local Plugin
3. Enter the local dev server URL (usually `http://localhost:5173`)

## Building

Build the plugin for production:

```bash
npm run build
```

Package for Framer:

```bash
npm run pack
```

## Testing

Run unit tests:

```bash
npm test
```

Run tests once (CI mode):

```bash
npm run test:run
```

## File Format Support

### CSV Format

The plugin expects CSV files with the following columns:

| Column | Required | Description |
|--------|----------|-------------|
| Name | Yes | Page display name |
| Slug | Yes | URL segment (e.g., "about" or "/" for root) |
| Parent Page | No | Name of the parent page for hierarchy |
| Type | No | Page type (ignored) |
| Complexity | No | Complexity level (ignored) |
| Service Type | No | Service type (ignored) |
| Depth | No | Nesting depth for validation |
| Cost | No | Cost estimate (ignored) |

**Important**: The parser handles unquoted cost values with commas (e.g., `$4,000`) by intelligently rejoining split columns.

Example:
```csv
Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
About,about,Static Page,Low,Design Only,Home,1,$300
Team,team,Static Page,Low,Design Only,About,2,$200
```

### XML Format

The plugin supports XML with the namespace `http://scope.pushrefresh.com/sitemap/1.0`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <project>
    <name>My Project</name>
    <client>Acme Corp</client>
  </project>
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <seoTitle>Welcome | My Site</seoTitle>
      <description>Main landing page</description>
      <order>1</order>
      <children>
        <page depth="1">
          <name>About</name>
          <slug>about</slug>
          <children>
            <page depth="2">
              <name>Team</name>
              <slug>team</slug>
            </page>
          </children>
        </page>
      </children>
    </page>
  </pages>
</sitemap>
```

## Generated Data Model

Both formats are normalized into this structure:

```typescript
interface PageNode {
  id: string;          // Stable hash of fullPath
  name: string;        // Display name
  slug: string;        // URL segment
  fullPath: string;    // Complete path (e.g., "/about/team")
  parentFullPath?: string;
  order?: number;
  seoTitle?: string;
  description?: string;
  children: PageNode[];
}
```

## Generation Options

### Static Pages

- **Create static pages**: Generate actual pages in Framer's Pages panel
- **Template page**: Clone an existing page's layout for new pages
- **Skip existing**: Don't modify pages that already exist at the same path
- **Update existing**: Update page names for existing pages

### CMS Collection

- **Create CMS items**: Generate a collection with items for each page
- **Collection name**: Name for the new or existing collection
- **Include SEO Title**: Add seoTitle field if present in source
- **Include Description**: Add description field if present in source
- **Include Order**: Add numeric order field for sorting
- **Update existing**: Update items that match by path

## CMS Collection Schema

When generating CMS content, the following fields are created:

| Field | Type | Description |
|-------|------|-------------|
| title | string | Page name |
| slug | string | URL-safe slug derived from path |
| path | string | Full path (e.g., "/about/team") |
| parentPath | string | Parent's full path |
| depth | number | Nesting level |
| seoTitle | string | SEO title (optional) |
| description | string | Page description (optional) |
| order | number | Sort order (optional) |

## Known Limitations

### Framer Plugin API Limitations

1. **Page Template Duplication**: The Framer Plugin API's page duplication may not copy all content/styles. Results vary by Framer version.

2. **CMS Template Binding**: Programmatically binding a CMS collection to a template page has limited support. You may need to manually:
   - Create a new page
   - Set it as a CMS page type
   - Bind it to the collection

3. **Page Path Conflicts**: Framer may have its own path normalization rules. The plugin attempts to match these, but manual adjustment may be needed for edge cases.

### CSV Parsing

- The comma-in-cost-field handling assumes exactly 8 logical columns
- Custom column counts require code modification

### XML Parsing

- Only the documented namespace is fully supported
- Alternative XML structures may not parse correctly

## Project Structure

```
framer-page-importer/
├── src/
│   ├── parsers/          # CSV, XML, normalization, validation
│   │   ├── csv.ts
│   │   ├── xml.ts
│   │   ├── normalize.ts
│   │   ├── validate.ts
│   │   └── __tests__/    # Unit tests
│   ├── framer/           # Framer API wrappers
│   │   ├── pages.ts
│   │   └── cms.ts
│   ├── ui/               # React components
│   │   ├── App.tsx
│   │   ├── FileUpload.tsx
│   │   ├── TreeView.tsx
│   │   ├── ValidationPanel.tsx
│   │   ├── ConfigPanel.tsx
│   │   ├── ProgressPanel.tsx
│   │   ├── ResultsSummary.tsx
│   │   └── LogPanel.tsx
│   ├── types.ts          # TypeScript interfaces
│   └── main.tsx          # Plugin entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Sample Test Files

Place test files in the project root:

### sample.csv
```csv
Name,Slug,Type,Complexity,Service Type,Parent Page,Depth,Cost
Home,/,Static Page,Low,Design Only,,0,$500
Solutions,solutions,Static Page,Medium,Design & Dev,Home,1,$2,000
Commercial HVAC,commercial-hvac,Static Page,High,Full Build,Solutions,2,$4,000
Residential,residential,Static Page,Medium,Design & Dev,Solutions,2,$3,000
About,about,Static Page,Low,Design Only,Home,1,$800
Contact,contact,Static Page,Low,Design Only,Home,1,$500
```

### sample.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemap xmlns="http://scope.pushrefresh.com/sitemap/1.0">
  <pages>
    <page depth="0">
      <name>Home</name>
      <slug>/</slug>
      <order>1</order>
      <children>
        <page depth="1">
          <name>Solutions</name>
          <slug>solutions</slug>
          <order>1</order>
          <children>
            <page depth="2">
              <name>Commercial HVAC</name>
              <slug>commercial-hvac</slug>
              <order>1</order>
            </page>
            <page depth="2">
              <name>Residential</name>
              <slug>residential</slug>
              <order>2</order>
            </page>
          </children>
        </page>
        <page depth="1">
          <name>About</name>
          <slug>about</slug>
          <order>2</order>
        </page>
        <page depth="1">
          <name>Contact</name>
          <slug>contact</slug>
          <order>3</order>
        </page>
      </children>
    </page>
  </pages>
</sitemap>
```

## Troubleshooting

### "No root pages found"
Your CSV needs at least one row with an empty "Parent Page" column.

### "Duplicate path" errors
Two pages resolve to the same URL. Edit the slug in the preview to resolve.

### Pages not appearing
Check Framer's Pages panel. The plugin creates pages but doesn't navigate to them.

### CMS items missing fields
Ensure "Include X" options are checked in the configuration step.

## License

MIT
