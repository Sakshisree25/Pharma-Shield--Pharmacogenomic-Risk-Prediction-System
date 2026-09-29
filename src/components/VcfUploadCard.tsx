import React, { useRef, useState } from 'react';
import {
  FileIcon,
  CloudUploadIcon,
  CloseIcon,
  ErrorIcon,
  CheckCircleIcon,
  DnaIcon,
} from './Icons';
import { createSampleVcfFile } from '../services/api';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

interface VcfUploadCardProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function validateVcfFile(file: File) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileName = file.name.toLowerCase();

  if (!fileName.endsWith('.vcf') && !fileName.endsWith('.vcf.gz')) {
    errors.push('Invalid file type. Please upload a .vcf or .vcf.gz file.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    errors.push(
      `File too large. Max allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`
    );
  }

  if (file.size === 0) {
    errors.push('File is empty.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      name: file.name,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2),
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString(),
    },
  };
}

export const VcfUploadCard: React.FC<VcfUploadCardProps> = ({
  onFileSelect,
  disabled = false,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (newFile: File) => {
    const validation = validateVcfFile(newFile);
    const sizeInMB = newFile.size / (1024 * 1024);
    const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

    setProgress(Math.min((sizeInMB / maxSizeMB) * 100, 100));
    setFile(newFile);
    setErrors(validation.errors);

    if (validation.isValid) {
      onFileSelect(newFile);
    } else {
      onFileSelect(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setErrors([]);
    setProgress(0);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleLoadSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    const sample = createSampleVcfFile();
    processFile(sample);
  };

  let cardClass = 'upload-card';
  if (isDragging) cardClass += ' dragging';
  if (disabled) cardClass += ' disabled';
  if (errors.length > 0) {
    cardClass += ' error';
  } else if (file) {
    cardClass += ' success';
  }

  return (
    <div>
      <div
        className={cardClass}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <div className="upload-content">
          {file ? (
            <div className="file-preview">
              <div className="file-icon-wrapper">
                <FileIcon className="file-icon" />
              </div>
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <div className="file-progress">
                  <div
                    className={`progress-bar ${
                      errors.length > 0 && file.size > MAX_FILE_SIZE_BYTES
                        ? 'over'
                        : ''
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="file-size">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB /{' '}
                  {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB
                </p>
                {errors.length > 0 && (
                  <div
                    className="validation-message error"
                    style={{ justifyContent: 'flex-start', marginTop: '8px' }}
                  >
                    <ErrorIcon />
                    <span className="error-text">{errors[0]}</span>
                  </div>
                )}
              </div>
              <div className="validation-status">
                {errors.length > 0 ? (
                  <ErrorIcon
                    className="error-icon"
                    style={{ color: '#ef4444' }}
                  />
                ) : (
                  <CheckCircleIcon className="check-icon" />
                )}
              </div>
              <button
                className="btn-remove"
                onClick={handleRemove}
                title="Remove file"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <>
              <div className="upload-icon-wrapper">
                <CloudUploadIcon className="upload-icon" />
              </div>
              <div className="upload-text">
                <p className="primary-text">Drag & Drop VCF File</p>
                <p className="secondary-text">or click to browse</p>
              </div>
              {errors.length > 0 && (
                <div className="validation-message error">
                  <ErrorIcon />
                  <span>{errors[0]}</span>
                </div>
              )}
              <p className="file-hint">
                Max file size: {MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB (.vcf, .vcf.gz)
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".vcf,.vcf.gz"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
      </div>

      {!file && (
        <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.8rem',
              borderRadius: '9999px',
            }}
            onClick={handleLoadSample}
            disabled={disabled}
          >
            <DnaIcon size={14} />
            <span>Load Sample Patient VCF</span>
          </button>
        </div>
      )}
    </div>
  );
};
