import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import API from '../api/axios';

const getFileIcon = (type) => {
  if (!type) return <FileIcon sx={{ fontSize: 22, color: '#FFB74D' }} />;
  if (type.startsWith('image/')) return <ImageIcon sx={{ fontSize: 22, color: '#00D9FF' }} />;
  if (type.includes('pdf')) return <PdfIcon sx={{ fontSize: 22, color: '#FF5252' }} />;
  if (type.includes('doc') || type.includes('word'))
    return <DocIcon sx={{ fontSize: 22, color: '#6C63FF' }} />;
  return <FileIcon sx={{ fontSize: 22, color: '#FFB74D' }} />;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  if (bytes < k) return `${bytes} B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
  return `${(bytes / (k * k)).toFixed(1)} MB`;
};

/**
 * Displays a list of attachments for a task or bug.
 *
 * @param {string} entityType - 'task' or 'bug'
 * @param {number} entityId - task or bug primary key
 * @param {boolean} collapsible - show expand/collapse toggle
 * @param {number} refreshKey - increment to trigger re-fetch
 */
export default function FileList({
  entityType = 'task',
  entityId,
  collapsible = false,
  refreshKey = 0,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!collapsible);

  const fetchFiles = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const params = entityType === 'task' ? { task_id: entityId } : { bug_id: entityId };
      const res = await API.get('/uploads', { params });
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch attachments', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshKey]);

  const handleDownload = async (file) => {
    try {
      const res = await API.get(file.url, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const handleDelete = async (fileId) => {
    try {
      await API.delete(`/uploads/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (files.length === 0 && !loading) return null;

  const isImage = (type) => type && type.startsWith('image/');

  return (
    <Box sx={{ mt: 1 }}>
      {/* Header */}
      {collapsible ? (
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            mb: 0.5,
            '&:hover': { opacity: 0.8 },
          }}
        >
          <AttachIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {files.length} Attachment{files.length !== 1 ? 's' : ''}
          </Typography>
          {expanded ? (
            <CollapseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          ) : (
            <ExpandIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          )}
        </Box>
      ) : (
        files.length > 0 && (
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.5, display: 'block' }}>
            Attachments ({files.length})
          </Typography>
        )
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {files.map((file) => (
            <Box
              key={file.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 2,
                background: (t) =>
                  t.palette.mode === 'dark'
                    ? 'rgba(148, 163, 184, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                border: (t) =>
                  `1px solid ${
                    t.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)'
                  }`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: (t) =>
                    t.palette.mode === 'dark'
                      ? 'rgba(148, 163, 184, 0.08)'
                      : 'rgba(0, 0, 0, 0.04)',
                },
              }}
              className="animate-fade-in"
            >
              {/* Thumbnail or icon */}
              {isImage(file.file_type) ? (
                <Box
                  component="img"
                  src={file.url}
                  alt={file.filename}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    objectFit: 'cover',
                    border: (t) =>
                      `1px solid ${
                        t.palette.mode === 'dark'
                          ? 'rgba(148, 163, 184, 0.15)'
                          : 'rgba(0, 0, 0, 0.08)'
                      }`,
                  }}
                />
              ) : (
                getFileIcon(file.file_type)
              )}

              {/* File info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                  {file.filename}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                    {formatFileSize(file.file_size)}
                  </Typography>
                  {file.uploaded_by && (
                    <>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        ·
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                        {file.uploaded_by}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 0.3 }}>
                <Tooltip title="Download">
                  <IconButton size="small" onClick={() => handleDownload(file)}>
                    <DownloadIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => handleDelete(file.id)}>
                    <DeleteIcon sx={{ fontSize: 16, color: 'error.main', opacity: 0.6 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
