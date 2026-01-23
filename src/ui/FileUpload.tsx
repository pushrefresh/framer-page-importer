/**
 * File upload component with drag-and-drop support
 */

import React, { useCallback, useState, useRef } from "react";
import { colors } from "./styles";

interface FileUploadProps {
  onFileSelect: (file: File, content: string) => void;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  acceptedTypes = [".csv", ".xml"],
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!acceptedTypes.includes(ext)) {
        setError(
          `Invalid file type. Please upload ${acceptedTypes.join(" or ")} files.`
        );
        return;
      }

      try {
        const content = await file.text();
        if (!content.trim()) {
          setError("File is empty");
          return;
        }
        onFileSelect(file, content);
      } catch (err) {
        setError(
          `Failed to read file: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    },
    [acceptedTypes, onFileSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div>
      <div
        style={{
          border: `1px dashed ${isDragging ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 10,
          padding: "32px 20px",
          textAlign: "center",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          backgroundColor: isDragging ? "rgba(255,255,255,0.03)" : "transparent",
          opacity: disabled ? 0.5 : 1,
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          style={{ display: "none" }}
          disabled={disabled}
        />

        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: colors.textSecondary }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: colors.text,
            marginBottom: 4,
          }}
        >
          {isDragging ? "Drop file here" : "Drop your file here"}
        </div>
        <div style={{ color: colors.textSecondary, fontSize: 12 }}>
          or{" "}
          <span style={{ color: colors.primary, fontWeight: 500 }}>
            browse
          </span>{" "}
          to upload
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            color: colors.textTertiary,
          }}
        >
          Supports CSV and XML files
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            backgroundColor: "rgba(255, 59, 48, 0.1)",
            color: colors.error,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
