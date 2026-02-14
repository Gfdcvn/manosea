"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/utils";

interface FileUploadProps {
  onUpload: (files: File[]) => void;
  onClose: () => void;
}

export function FileUpload({ onUpload, onClose }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is too large (max 25MB)`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      return `${file.name} is not a supported file type`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const errors: string[] = [];
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    fileArray.forEach((file) => {
      const err = validateFile(file);
      if (err) {
        errors.push(err);
      } else {
        validFiles.push(file);
        if (file.type.startsWith("image/")) {
          newPreviews.push(URL.createObjectURL(file));
        } else {
          newPreviews.push("");
        }
      }
    });

    if (errors.length > 0) {
      setError(errors.join("\n"));
    }

    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = () => {
    if (files.length > 0) {
      onUpload(files);
    }
  };

  return (
    <div className="w-[400px] bg-discord-channel border border-gray-700 rounded-lg shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Upload Files</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-discord-red/10 border border-discord-red/20 rounded p-2 text-discord-red text-xs mb-3">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-discord-brand bg-discord-brand/10"
            : "border-gray-600 hover:border-gray-500"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-400">
          Drag & drop files here or <span className="text-discord-brand">browse</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">Max 25MB per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-discord-darker rounded p-2">
              {previews[idx] ? (
                <img
                  src={previews[idx]}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-discord-active rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="text-gray-400 hover:text-discord-red shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpload} className="flex-1">
            Upload {files.length} file{files.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
