import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import API from '../api/axios';

const getFileIcon = (type) => {
  if (!type) return <FileIcon sx={{ fontSize: 28 }} />;
  if (type.startsWith('image/')) return <ImageIcon sx={{ fontSize: 28, color: '#00D9FF' }} />;
  if (type.includes('pdf')) return <PdfIcon sx={{ fontSize: 28, color: '#FF5252' }} />;
  if (type.includes('doc') || type.includes('word'))
    return <DocIcon sx={{ fontSize: 28, color: '#6C63FF' }} />;
  return <FileIcon sx={{ fontSize: 28, color: '#FFB74D' }} />;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
  return `${(bytes / (k * k)).toFixed(1)} MB`;
};

/**
 * Drag-and-drop file upload component.
 *
 * @param {string} entityType - 'task' or 'bug'
 * @param {number|null} entityId - task or bug primary key (null for pending uploads)
 * @param {function} onUploadComplete - callback after successful upload
 * @param {boolean} disabled - disable upload
 */
export default function FileUpload({
  entityType = 'task',
  entityId = null,
  onUploadComplete,
  disabled = false,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const uploadFile = async (file) => {
    if (!entityId) {
      // Store pending — will upload after entity creation
      setPendingFiles((prev) => [...prev, file]);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append(entityType === 'task' ? 'task_id' : 'bug_id', entityId);

    try {
      await API.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setProgress(pct);
        },
      });
      onUploadComplete?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;

      const files = e.dataTransfer?.files;
      if (files?.length) {
        Array.from(files).forEach(uploadFile);
      }
    },
    [entityId, disabled]
  );

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files?.length) {
      Array.from(files).forEach(uploadFile);
    }
    e.target.value = '';
  };

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Expose pending files for parent to upload after entity creation
  FileUpload.getPendingFiles = () => pendingFiles;
  FileUpload.clearPending = () => setPendingFiles([]);

  return (
    <Box>
      {/* Drop zone */}
      <Box
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: dragActive
            ? 'primary.main'
            : (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'rgba(0, 0, 0, 0.12)',
          borderRadius: 3,
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          background: dragActive
            ? (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(108, 99, 255, 0.08)'
                  : 'rgba(91, 82, 224, 0.04)'
            : 'transparent',
          transition: 'all 0.25s ease',
          opacity: disabled ? 0.5 : 1,
          '&:hover': disabled
            ? {}
            : {
                borderColor: 'primary.light',
                background: (t) =>
                  t.palette.mode === 'dark'
                    ? 'rgba(108, 99, 255, 0.04)'
                    : 'rgba(91, 82, 224, 0.02)',
              },
        }}
        className={dragActive ? 'drop-zone-pulse' : ''}
      >
        <UploadIcon
          sx={{
            fontSize: 36,
            color: dragActive ? 'primary.main' : 'text.secondary',
            mb: 1,
            transition: 'color 0.2s ease',
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          PNG, JPG, PDF, DOC, XLSX, CSV, TXT (max 10MB)
        </Typography>

        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={handleFileSelect}
          accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.txt,.xlsx,.csv"
        />
      </Box>

      {/* Upload progress */}
      {uploading && (
        <Box sx={{ mt: 1.5 }} className="animate-fade-in">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Uploading...
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main' }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: (t) =>
                t.palette.mode === 'dark'
                  ? 'rgba(148, 163, 184, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(90deg, #6C63FF, #00D9FF)',
              },
            }}
          />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Typography
          variant="caption"
          sx={{ color: 'error.main', mt: 1, display: 'block' }}
          className="animate-fade-in"
        >
          {error}
        </Typography>
      )}

      {/* Pending files (before entity creation) */}
      {pendingFiles.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Files to upload ({pendingFiles.length}):
          </Typography>
          {pendingFiles.map((file, idx) => (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 0.5,
                p: 1,
                borderRadius: 2,
                background: (t) =>
                  t.palette.mode === 'dark'
                    ? 'rgba(148, 163, 184, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
              }}
              className="animate-slide-up"
            >
              {getFileIcon(file.type)}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => removePending(idx)}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * Upload pending files for a newly created entity.
 * Call this after creating a task/bug to upload queued files.
 */
export async function uploadPendingFiles(files, entityType, entityId, onProgress) {
  const results = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(entityType === 'task' ? 'task_id' : 'bug_id', entityId);

    try {
      const res = await API.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
      });
      results.push(res.data);
    } catch (err) {
      console.error('Failed to upload', file.name, err);
    }
  }
  return results;
}
