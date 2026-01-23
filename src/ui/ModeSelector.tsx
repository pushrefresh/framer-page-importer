/**
 * Mode selector component - first step to choose import type
 */

import React from "react";
import type { ImportMode } from "../types";

interface ModeSelectorProps {
  onSelectMode: (mode: ImportMode) => void;
  isCmsAvailable: boolean;
}

const ModeCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledMessage?: string;
}> = ({ title, description, icon, onClick, disabled, disabledMessage }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        backgroundColor: isHovered ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
        border: "none",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.4 : 1,
        width: "100%",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.95)",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.3,
          }}
        >
          {description}
        </div>
        {disabled && disabledMessage && (
          <div
            style={{
              marginTop: 6,
              padding: "2px 6px",
              backgroundColor: "rgba(255, 159, 10, 0.12)",
              borderRadius: 3,
              fontSize: 10,
              color: "#FF9F0A",
              display: "inline-block",
            }}
          >
            {disabledMessage}
          </div>
        )}
      </div>
      {!disabled && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
};

const PageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CmsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </svg>
);

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  onSelectMode,
  isCmsAvailable,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ModeCard
        title="Static Pages"
        description="Create pages in Framer from your sitemap"
        icon={<PageIcon />}
        onClick={() => onSelectMode("static")}
      />

      <ModeCard
        title="CMS Items"
        description="Import content into this CMS collection"
        icon={<CmsIcon />}
        onClick={() => onSelectMode("cms")}
        disabled={!isCmsAvailable}
        disabledMessage="Open from CMS collection"
      />
    </div>
  );
};
