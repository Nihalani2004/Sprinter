import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Skeleton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  BugReport as BugIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import FileUpload, { uploadPendingFiles } from '../components/FileUpload';
import FileList from '../components/FileList';

const statusColors = {
  Open: '#FF5252',
  Fixed: '#FFB74D',
  Verified: '#00D9FF',
  Closed: '#00E676',
};

export default function Bugs() {
  const { user } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBug, setSelectedBug] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({ task_pk: '', description: '' });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [newStatus, setNewStatus] = useState('');
  const [fileRefreshKey, setFileRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [bugsRes, tasksRes] = await Promise.all([
        API.get('/bugs'),
        API.get('/tasks/all'),
      ]);
      setBugs(bugsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error('Failed to load bugs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocket('bug_created', fetchData);
  useSocket('bug_updated', fetchData);
  useSocket('bug_deleted', fetchData);

  const handleCreate = async () => {
    try {
      const res = await API.post('/bugs', {
        task_pk: parseInt(form.task_pk),
        description: form.description,
      });
      const createdBug = res.data;

      // Upload pending files
      if (pendingFiles.length > 0 && createdBug?.id) {
        await uploadPendingFiles(pendingFiles, 'bug', createdBug.id);
      }

      setSnackbar({ open: true, message: 'Bug reported successfully', severity: 'success' });
      setCreateOpen(false);
      setForm({ task_pk: '', description: '' });
      setPendingFiles([]);
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to report bug', severity: 'error' });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedBug) return;
    try {
      await API.patch(`/bugs/${selectedBug.id}/status`, { status: newStatus });
      setSnackbar({ open: true, message: `Bug status updated to ${newStatus}`, severity: 'success' });
      setStatusOpen(false);
      setNewStatus('');
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update bug', severity: 'error' });
    }
  };

  const handleDelete = async (bug) => {
    if (!window.confirm(`Delete bug "${bug.bug_id}"?`)) return;
    try {
      await API.delete(`/bugs/${bug.id}`);
      setSnackbar({ open: true, message: 'Bug deleted', severity: 'success' });
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete bug', severity: 'error' });
    }
  };

  const handlePendingFileAdd = (e) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = '';
  };

  const removePendingFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={200} height={50} />
        <Skeleton variant="rounded" height={400} sx={{ mt: 2, borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Bugs</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Track and manage bugs across all tasks
          </Typography>
        </Box>
        {(user?.role === 'Tester' || user?.role === 'Manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #FF5252, #FF8A80)',
              '&:hover': { background: 'linear-gradient(135deg, #D32F2F, #FF5252)' },
            }}
            id="report-bug-btn"
          >
            Report Bug
          </Button>
        )}
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {Object.entries(statusColors).map(([status, color]) => {
          const count = bugs.filter((b) => b.status === status).length;
          return (
            <Chip
              key={status}
              icon={<BugIcon sx={{ fontSize: 16 }} />}
              label={`${status}: ${count}`}
              sx={{
                background: `${color}15`,
                color,
                fontWeight: 600,
                border: `1px solid ${color}30`,
                px: 1,
              }}
            />
          );
        })}
      </Box>

      {/* Bugs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Bug ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Task</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Sprint</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bugs.map((bug) => (
                  <TableRow
                    key={bug.id}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        background: (t) =>
                          t.palette.mode === 'dark'
                            ? 'rgba(255,82,82,0.04)'
                            : 'rgba(211,47,47,0.03)',
                      },
                      transition: 'background 0.2s ease',
                    }}
                    onClick={() => {
                      setSelectedBug(bug);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>#{bug.bug_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {bug.description}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={`${bug.task_id} — ${bug.task_title}`} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip label={`Sprint ${bug.sprint_id}`} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={bug.status}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBug(bug);
                          setNewStatus('');
                          setStatusOpen(true);
                        }}
                        sx={{
                          background: `${statusColors[bug.status]}20`,
                          color: statusColors[bug.status],
                          fontWeight: 600,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          '&:hover': { background: `${statusColors[bug.status]}35` },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box onClick={(e) => e.stopPropagation()}>
                        {user?.role === 'Manager' && (
                          <Tooltip title="Delete Bug">
                            <IconButton size="small" onClick={() => handleDelete(bug)} sx={{ color: 'error.main' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {bugs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      No bugs reported yet 🎉
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Bug Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Bug #{selectedBug?.bug_id}
        </DialogTitle>
        <DialogContent>
          {selectedBug && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={selectedBug.status}
                  size="small"
                  sx={{
                    background: `${statusColors[selectedBug.status]}20`,
                    color: statusColors[selectedBug.status],
                    fontWeight: 600,
                  }}
                />
                <Chip label={`Task: ${selectedBug.task_id}`} size="small" variant="outlined" />
                <Chip label={`Sprint ${selectedBug.sprint_id}`} size="small" variant="outlined" />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedBug.description}
              </Typography>

              <Divider />

              {/* File attachments */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Attachments
              </Typography>
              <FileUpload
                entityType="bug"
                entityId={selectedBug.id}
                onUploadComplete={() => setFileRefreshKey((k) => k + 1)}
              />
              <FileList
                entityType="bug"
                entityId={selectedBug.id}
                refreshKey={fileRefreshKey}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Report Bug Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setPendingFiles([]); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Report Bug</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Task</InputLabel>
              <Select value={form.task_pk} onChange={(e) => setForm({ ...form, task_pk: e.target.value })} label="Task">
                {tasks.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.task_id} — {t.title} (Sprint {t.sprint_id})</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Bug Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={4}
              placeholder="Describe the bug in detail..."
            />

            <Divider />

            {/* Pending file attachments */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Attach Screenshots/Files (optional)
            </Typography>
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: (t) => t.palette.mode === 'dark' ? 'rgba(148,163,184,0.2)' : 'rgba(0,0,0,0.12)',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { borderColor: 'error.light' },
                transition: 'border-color 0.2s ease',
              }}
            >
              <AttachIcon sx={{ color: 'text.secondary', mb: 0.5 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                Click to add files (uploaded after creation)
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                onChange={handlePendingFileAdd}
                accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.txt,.xlsx,.csv"
              />
            </Box>
            {pendingFiles.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {pendingFiles.map((file, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 0.8,
                      borderRadius: 1.5,
                      background: (t) => t.palette.mode === 'dark' ? 'rgba(148,163,184,0.05)' : 'rgba(0,0,0,0.03)',
                    }}
                  >
                    <AttachIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ flex: 1 }} noWrap>{file.name}</Typography>
                    <IconButton size="small" onClick={() => removePendingFile(idx)}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setCreateOpen(false); setPendingFiles([]); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            sx={{ background: 'linear-gradient(135deg, #FF5252, #FF8A80)' }}
          >
            Report Bug {pendingFiles.length > 0 ? `(+${pendingFiles.length} files)` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Bug: #{selectedBug?.bug_id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Current: <Chip label={selectedBug?.status} size="small" sx={{ ml: 1 }} />
          </Typography>
          <FormControl fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="New Status">
              {['Open', 'Fixed', 'Verified', 'Closed'].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
