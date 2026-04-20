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
  Collapse,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PersonAdd as AssignIcon,
  BugReport as BugIcon,
  AttachFile as AttachIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import FileUpload, { uploadPendingFiles } from '../components/FileUpload';
import FileList from '../components/FileList';

const statusColors = {
  Pending: '#FFB74D',
  'In Progress': '#00D9FF',
  Testing: '#CE93D8',
  Completed: '#00E676',
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [expandedRow, setExpandedRow] = useState(null);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);

  // Create form
  const [form, setForm] = useState({ sprint_id: '', task_id: '', title: '', description: '', assigned_to: '' });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [assignTo, setAssignTo] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, sprintsRes] = await Promise.all([
        API.get('/tasks'),
        API.get('/sprints'),
      ]);
      setTasks(tasksRes.data.tasks || []);
      setSprints(sprintsRes.data);

      if (user?.role === 'Manager') {
        const devsRes = await API.get('/users/developers');
        setDevelopers(devsRes.data);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocket('task_created', fetchData);
  useSocket('task_updated', fetchData);
  useSocket('task_deleted', fetchData);
  useSocket('task_assigned', fetchData);

  const handleCreate = async () => {
    try {
      const res = await API.post('/tasks', form);
      const createdTask = res.data;

      // Upload pending files
      if (pendingFiles.length > 0 && createdTask?.id) {
        await uploadPendingFiles(pendingFiles, 'task', createdTask.id);
      }

      setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
      setCreateOpen(false);
      setForm({ sprint_id: '', task_id: '', title: '', description: '', assigned_to: '' });
      setPendingFiles([]);
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to create task', severity: 'error' });
    }
  };

  const handleAssign = async () => {
    if (!selectedTask) return;
    try {
      await API.patch(`/tasks/${selectedTask.id}/assign`, { assigned_to: assignTo });
      setSnackbar({ open: true, message: `Task assigned to ${assignTo}`, severity: 'success' });
      setAssignOpen(false);
      setAssignTo('');
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to assign task', severity: 'error' });
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedTask) return;
    try {
      await API.patch(`/tasks/${selectedTask.id}/status`, { status: newStatus });
      setSnackbar({ open: true, message: `Status updated to ${newStatus}`, severity: 'success' });
      setStatusOpen(false);
      setNewStatus('');
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update status', severity: 'error' });
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await API.delete(`/tasks/${task.id}`);
      setSnackbar({ open: true, message: 'Task deleted', severity: 'success' });
      fetchData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete task', severity: 'error' });
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
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Tasks</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {user?.role === 'Manager' ? 'Manage all tasks across sprints' :
             user?.role === 'Developer' ? 'Your assigned tasks' : 'Tasks in testing phase'}
          </Typography>
        </Box>
        {user?.role === 'Manager' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            id="create-task-btn"
          >
            New Task
          </Button>
        )}
      </Box>

      {/* Tasks Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Task ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Sprint</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Assigned To</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Bugs</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        background: (t) =>
                          t.palette.mode === 'dark'
                            ? 'rgba(108,99,255,0.04)'
                            : 'rgba(91,82,224,0.03)',
                      },
                      transition: 'background 0.2s ease',
                    }}
                    onClick={() => {
                      setSelectedTask(task);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{task.task_id}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.title}</Typography>
                      {task.description && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {task.description.substring(0, 60)}{task.description.length > 60 ? '...' : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={`Sprint ${task.sprint_id}`} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setNewStatus('');
                          setStatusOpen(true);
                        }}
                        sx={{
                          background: `${statusColors[task.status]}20`,
                          color: statusColors[task.status],
                          fontWeight: 600,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          '&:hover': { background: `${statusColors[task.status]}35` },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: task.assigned_to === '-' ? 'text.secondary' : 'text.primary', display: { xs: 'none', md: 'table-cell' } }}>
                      {task.assigned_to || '—'}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      {task.bug_count > 0 ? (
                        <Chip
                          icon={<BugIcon sx={{ fontSize: 14 }} />}
                          label={task.bug_count}
                          size="small"
                          sx={{ background: 'rgba(255,82,82,0.12)', color: '#FF5252', fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>0</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                        {user?.role === 'Manager' && (
                          <>
                            <Tooltip title="Assign Developer">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setAssignTo(task.assigned_to === '-' ? '' : task.assigned_to);
                                  setAssignOpen(true);
                                }}
                              >
                                <AssignIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Task">
                              <IconButton size="small" onClick={() => handleDelete(task)} sx={{ color: 'error.main' }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      No tasks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedTask?.task_id} — {selectedTask?.title}
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={selectedTask.status}
                  size="small"
                  sx={{
                    background: `${statusColors[selectedTask.status]}20`,
                    color: statusColors[selectedTask.status],
                    fontWeight: 600,
                  }}
                />
                <Chip label={`Sprint ${selectedTask.sprint_id}`} size="small" variant="outlined" />
                {selectedTask.assigned_to && selectedTask.assigned_to !== '-' && (
                  <Chip label={`→ ${selectedTask.assigned_to}`} size="small" variant="outlined" />
                )}
              </Box>

              {selectedTask.description && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {selectedTask.description}
                </Typography>
              )}

              <Divider />

              {/* File attachments */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Attachments
              </Typography>
              <FileUpload
                entityType="task"
                entityId={selectedTask.id}
                onUploadComplete={() => setFileRefreshKey((k) => k + 1)}
              />
              <FileList
                entityType="task"
                entityId={selectedTask.id}
                refreshKey={fileRefreshKey}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setPendingFiles([]); }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Sprint</InputLabel>
              <Select value={form.sprint_id} onChange={(e) => setForm({ ...form, sprint_id: e.target.value })} label="Sprint">
                {sprints.map((s) => (
                  <MenuItem key={s.sprint_id} value={s.sprint_id}>Sprint {s.sprint_id} — {s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Task ID" value={form.task_id} onChange={(e) => setForm({ ...form, task_id: e.target.value })} fullWidth />
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
            <FormControl fullWidth>
              <InputLabel>Assign To (optional)</InputLabel>
              <Select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} label="Assign To (optional)">
                <MenuItem value="">— None —</MenuItem>
                {developers.map((d) => (
                  <MenuItem key={d.username} value={d.username}>{d.username}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider />

            {/* Pending file attachments */}
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Attach Files (optional)
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
                '&:hover': { borderColor: 'primary.light' },
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
          <Button variant="contained" onClick={handleCreate}>
            Create Task {pendingFiles.length > 0 ? `(+${pendingFiles.length} files)` : ''}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Assign Task: {selectedTask?.task_id}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Developer</InputLabel>
            <Select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} label="Developer">
              <MenuItem value="">— Unassign —</MenuItem>
              {developers.map((d) => (
                <MenuItem key={d.username} value={d.username}>{d.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssign}>Assign</Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusOpen} onClose={() => setStatusOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Update Status: {selectedTask?.task_id}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Current: <Chip label={selectedTask?.status} size="small" sx={{ ml: 1 }} />
          </Typography>
          <FormControl fullWidth>
            <InputLabel>New Status</InputLabel>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} label="New Status">
              {['Pending', 'In Progress', 'Testing', 'Completed'].map((s) => (
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
