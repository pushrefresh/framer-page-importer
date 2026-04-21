/**
 * Tree view component for displaying page hierarchy
 */

import React, { useState, useCallback } from "react";
import type { PageNode } from "../types";
import { colors } from "./styles";

interface TreeViewProps {
  nodes: PageNode[];
  selectedIds: Set<string>;
  onToggleSelect: (nodeId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  expandedByDefault?: boolean;
  showCheckboxes?: boolean;
  onEditSlug?: (nodeId: string, newSlug: string) => void;
}

interface TreeNodeProps {
  node: PageNode;
  depth: number;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  onToggleSelect: (nodeId: string) => void;
  showCheckboxes: boolean;
  editingNodeId: string | null;
  editValue: string;
  onStartEdit: (nodeId: string, currentSlug: string) => void;
  onEditChange: (value: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
}

const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  depth,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
  showCheckboxes,
  editingNodeId,
  editValue,
  onStartEdit,
  onEditChange,
  onEditSubmit,
  onEditCancel,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedIds.has(node.id);
  const isEditing = editingNodeId === node.id;
  const [isHovered, setIsHovered] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onEditSubmit();
    else if (e.key === "Escape") onEditCancel();
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px",
          paddingLeft: 8 + depth * 16,
          borderBottom: `1px solid ${colors.divider}`,
          transition: "background 0.1s ease",
          backgroundColor: isSelected
            ? colors.primaryDimmed
            : isHovered
              ? colors.backgroundTertiary
              : "transparent",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse */}
        <span
          style={{
            width: 12,
            height: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: hasChildren ? "pointer" : "default",
            color: colors.textTertiary,
            flexShrink: 0,
          }}
          onClick={() => hasChildren && onToggleExpand(node.id)}
        >
          {hasChildren && (
            <svg
              width="7"
              height="7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.1s ease",
              }}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </span>

        {/* Checkbox */}
        {showCheckboxes && (
          <div
            onClick={() => onToggleSelect(node.id)}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              border: isSelected ? "none" : `1px solid ${colors.textTertiary}`,
              backgroundColor: isSelected ? colors.primary : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.1s ease",
            }}
          >
            {isSelected && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textReversed}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}

        {/* Page icon */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textSecondary}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>

        {/* Name */}
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
            fontSize: 12,
            color: colors.text,
          }}
        >
          {node.name}
        </span>

        {/* Path */}
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={onEditSubmit}
            autoFocus
            style={{
              width: 100,
              padding: "1px 5px",
              fontSize: 10,
              borderRadius: 3,
              border: `1px solid ${colors.primary}`,
              backgroundColor: colors.backgroundTertiary,
              color: colors.text,
              outline: "none",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 10,
              color: colors.textTertiary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 120,
              cursor: "pointer",
            }}
            onClick={() => onStartEdit(node.id, node.slug)}
            title={node.fullPath}
          >
            {node.fullPath}
          </span>
        )}

        {/* Children count */}
        {hasChildren && (
          <span
            style={{
              padding: "0px 4px",
              borderRadius: 3,
              fontSize: 9,
              fontWeight: 600,
              backgroundColor: colors.primaryDimmed,
              color: colors.primary,
            }}
          >
            {node.children.length}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && node.children.map((child) => (
        <TreeNodeComponent
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onToggleSelect={onToggleSelect}
          showCheckboxes={showCheckboxes}
          editingNodeId={editingNodeId}
          editValue={editValue}
          onStartEdit={onStartEdit}
          onEditChange={onEditChange}
          onEditSubmit={onEditSubmit}
          onEditCancel={onEditCancel}
        />
      ))}
    </>
  );
};

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  expandedByDefault = true,
  showCheckboxes = true,
  onEditSlug,
}) => {
  const getAllIds = useCallback((nodeList: PageNode[]): string[] => {
    const ids: string[] = [];
    const walk = (list: PageNode[]) => {
      for (const node of list) {
        ids.push(node.id);
        if (node.children.length > 0) walk(node.children);
      }
    };
    walk(nodeList);
    return ids;
  }, []);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() =>
    expandedByDefault ? new Set(getAllIds(nodes)) : new Set()
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => setExpandedIds(new Set(getAllIds(nodes))), [nodes, getAllIds]);
  const handleCollapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const handleStartEdit = useCallback((nodeId: string, currentSlug: string) => {
    setEditingNodeId(nodeId);
    setEditValue(currentSlug);
  }, []);

  const handleEditSubmit = useCallback(() => {
    if (editingNodeId && onEditSlug && editValue.trim()) {
      onEditSlug(editingNodeId, editValue.trim());
    }
    setEditingNodeId(null);
    setEditValue("");
  }, [editingNodeId, editValue, onEditSlug]);

  const handleEditCancel = useCallback(() => {
    setEditingNodeId(null);
    setEditValue("");
  }, []);

  const totalCount = getAllIds(nodes).length;
  const selectedCount = selectedIds.size;

  const TextButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <span
      onClick={onClick}
      style={{
        cursor: "pointer",
        fontSize: 11,
        color: colors.textSecondary,
        transition: "color 0.1s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = colors.text)}
      onMouseLeave={(e) => (e.currentTarget.style.color = colors.textSecondary)}
    >
      {children}
    </span>
  );

  return (
    <div>
      {/* Toolbar - minimal text links */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          padding: "0 2px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <TextButton onClick={handleExpandAll}>Expand</TextButton>
          <TextButton onClick={handleCollapseAll}>Collapse</TextButton>
        </div>

        {showCheckboxes && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: colors.textTertiary, fontSize: 11 }}>
              {selectedCount}/{totalCount}
            </span>
            <TextButton onClick={onSelectAll}>All</TextButton>
            <TextButton onClick={onDeselectAll}>None</TextButton>
          </div>
        )}
      </div>

      {/* Tree */}
      <div
        style={{
          borderRadius: 6,
          backgroundColor: colors.backgroundSecondary,
          maxHeight: 280,
          overflow: "auto",
          border: `1px solid ${colors.divider}`,
        }}
      >
        {nodes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: colors.textTertiary, fontSize: 12 }}>
            No pages to display
          </div>
        ) : (
          nodes.map((node) => (
            <TreeNodeComponent
              key={node.id}
              node={node}
              depth={0}
              selectedIds={selectedIds}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={onToggleSelect}
              showCheckboxes={showCheckboxes}
              editingNodeId={editingNodeId}
              editValue={editValue}
              onStartEdit={handleStartEdit}
              onEditChange={(v) => setEditValue(v)}
              onEditSubmit={handleEditSubmit}
              onEditCancel={handleEditCancel}
            />
          ))
        )}
      </div>
    </div>
  );
};
