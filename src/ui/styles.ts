/**
 * Shared styles for the plugin UI
 *
 * Using Framer's CSS variables for automatic light/dark mode support
 * Reference: https://www.framer.com/developers/interface
 */

// Framer CSS variables - these automatically adjust for light/dark mode
export const colors = {
  // Framer's built-in CSS variables
  primary: "var(--framer-color-tint)",
  primaryDimmed: "var(--framer-color-tint-dimmed)",
  primaryDark: "var(--framer-color-tint-dark)",
  text: "var(--framer-color-text)",
  textReversed: "var(--framer-color-text-reversed)",
  textSecondary: "var(--framer-color-text-secondary)",
  textTertiary: "var(--framer-color-text-tertiary)",
  textMuted: "var(--framer-color-text-tertiary)",
  background: "var(--framer-color-bg)",
  backgroundSecondary: "var(--framer-color-bg-secondary)",
  backgroundTertiary: "var(--framer-color-bg-tertiary)",
  divider: "var(--framer-color-divider)",
  border: "var(--framer-color-divider)",
  // Semantic colors
  success: "#34C759",
  warning: "#FF9F0A",
  error: "#FF3B30",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
};

export const styles: Record<string, React.CSSProperties> = {
  // Main container
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 13,
    lineHeight: 1.5,
    overflow: "hidden",
  },

  // Header
  header: {
    padding: "14px 16px",
    borderBottom: `1px solid ${colors.divider}`,
  },

  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
    letterSpacing: "-0.01em",
  },

  subtitle: {
    margin: 0,
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Content area
  content: {
    flex: 1,
    overflow: "auto",
    padding: 16,
  },

  // Footer
  footer: {
    padding: "10px 16px",
    borderTop: `1px solid ${colors.divider}`,
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },

  // Sections
  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textTertiary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 10,
  },

  // Buttons
  button: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    transition: "all 0.12s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  buttonPrimary: {
    backgroundColor: colors.primary,
    color: colors.textReversed,
  },

  buttonSecondary: {
    backgroundColor: colors.backgroundTertiary,
    color: colors.text,
  },

  buttonDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },

  buttonSmall: {
    padding: "3px 8px",
    fontSize: 11,
  },

  // Inputs
  input: {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.divider}`,
    backgroundColor: colors.backgroundTertiary,
    color: colors.text,
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s ease",
  },

  inputFocus: {
    borderColor: colors.primary,
  },

  select: {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 6,
    border: `1px solid ${colors.divider}`,
    backgroundColor: colors.backgroundTertiary,
    color: colors.text,
    fontSize: 12,
    outline: "none",
    boxSizing: "border-box" as const,
    cursor: "pointer",
    transition: "border-color 0.15s ease",
  },

  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
  },

  checkboxInput: {
    width: 14,
    height: 14,
    cursor: "pointer",
    accentColor: colors.primary,
    margin: 0,
  },

  // Tree view
  treeContainer: {
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    maxHeight: 300,
    overflow: "auto",
    border: `1px solid ${colors.divider}`,
  },

  treeNode: {
    padding: "6px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderBottom: `1px solid ${colors.divider}`,
    cursor: "default",
    transition: "background 0.1s ease",
  },

  treeNodeHover: {
    backgroundColor: colors.backgroundTertiary,
  },

  treeNodeSelected: {
    backgroundColor: colors.primaryDimmed,
  },

  treeNodeName: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    fontWeight: 500,
    fontSize: 12,
  },

  treeNodePath: {
    fontSize: 11,
    color: colors.textTertiary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    maxWidth: 140,
  },

  // Validation
  validationPanel: {
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${colors.divider}`,
  },

  validationHeader: {
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 500,
    fontSize: 12,
  },

  validationList: {
    maxHeight: 100,
    overflow: "auto",
  },

  validationItem: {
    padding: "8px 10px",
    borderTop: `1px solid ${colors.divider}`,
    fontSize: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },

  errorItem: {
    backgroundColor: "rgba(255, 59, 48, 0.08)",
  },

  warningItem: {
    backgroundColor: "rgba(255, 159, 10, 0.08)",
  },

  // Progress
  progressContainer: {
    marginBottom: 16,
  },

  progressBar: {
    height: 3,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    transition: "width 0.3s ease",
    borderRadius: 2,
  },

  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },

  // Results
  resultsSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 16,
  },

  resultCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    textAlign: "center" as const,
    border: `1px solid ${colors.divider}`,
  },

  resultNumber: {
    fontSize: 24,
    fontWeight: 600,
    marginBottom: 2,
    letterSpacing: "-0.02em",
  },

  resultLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },

  // Logs
  logContainer: {
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    maxHeight: 160,
    overflow: "auto",
    fontFamily: "var(--framer-font-mono, monospace)",
    fontSize: 11,
    border: `1px solid ${colors.divider}`,
  },

  logEntry: {
    padding: "4px 10px",
    borderBottom: `1px solid ${colors.divider}`,
    display: "flex",
    gap: 8,
  },

  logTime: {
    color: colors.textTertiary,
    flexShrink: 0,
  },

  logMessage: {
    flex: 1,
    wordBreak: "break-word" as const,
  },

  // Badges
  badge: {
    padding: "2px 6px",
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 600,
  },

  badgeSuccess: {
    backgroundColor: "rgba(52, 199, 89, 0.15)",
    color: colors.success,
  },

  badgeError: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    color: colors.error,
  },

  badgeWarning: {
    backgroundColor: "rgba(255, 159, 10, 0.15)",
    color: colors.warning,
  },

  badgeInfo: {
    backgroundColor: colors.primaryDimmed,
    color: colors.primary,
  },

  // Form groups
  formGroup: {
    marginBottom: 14,
  },

  label: {
    display: "block",
    marginBottom: 4,
    fontSize: 11,
    fontWeight: 500,
    color: colors.textSecondary,
  },

  // Flex helpers
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  spaceBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Info/hint text
  hint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    lineHeight: 1.4,
  },

  // Empty state
  emptyState: {
    textAlign: "center" as const,
    padding: 24,
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Card style
  card: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    border: `1px solid ${colors.divider}`,
  },

  // Info box
  infoBox: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: colors.primaryDimmed,
    fontSize: 12,
    color: colors.text,
    lineHeight: 1.4,
  },

  // Warning box
  warningBox: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: "rgba(255, 159, 10, 0.12)",
    fontSize: 12,
    color: colors.text,
    lineHeight: 1.4,
  },
};
