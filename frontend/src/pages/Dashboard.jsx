import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Task as TaskIcon,
  BugReport as BugIcon,
  TrendingUp as TrendingIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import StatCard from '../components/StatCard';

const statusColors = {
  Pending: '#FFB74D',
  'In Progress': '#00D9FF',
  Testing: '#CE93D8',
  Completed: '#00E676',
  Open: '#FF5252',
  Fixed: '#FFB74D',
  Verified: '#00D9FF',
  Closed: '#00E676',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', duration_days: 7 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await API.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateSprint = async () => {
    try {
      await API.post('/sprints', sprintForm);
      setSnackbar({ open: true, message: 'Sprint created successfully', severity: 'success' });
      setCreateSprintOpen(false);
      setSprintForm({ name: '', duration_days: 7 });
      fetchDashboard();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to create sprint', severity: 'error' });
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Real-time refresh on any mutation
  useSocket('task_created', fetchDashboard);
  useSocket('task_updated', fetchDashboard);
  useSocket('task_deleted', fetchDashboard);
  useSocket('bug_created', fetchDashboard);
  useSocket('bug_updated', fetchDashboard);
  useSocket('sprint_created', fetchDashboard);
  useSocket('sprint_deleted', fetchDashboard);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const taskPieData = data?.tasks_by_status
    ? Object.entries(data.tasks_by_status).map(([name, value]) => ({ name, value }))
    : [];

  const bugBarData = data?.bugs_by_status
    ? Object.entries(data.bugs_by_status).map(([name, value]) => ({ name, value }))
    : [];

  // Sprint progress data
  const sprintProgress = data?.sprints?.map((s) => {
    const total = s.task_count || 0;
    const completed = s.completed_count || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { ...s, total, completed, pct };
  }) || [];

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Welcome back, <strong>{user?.username}</strong> — here's your project overview
          </Typography>
        </Box>
        {user?.role === 'Manager' && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateSprintOpen(true)}
            id="create-sprint-btn"
          >
            New Sprint
          </Button>
        )}
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }} className="stagger-children">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Sprints"
            value={data?.total_sprints || 0}
            icon={<SpeedIcon />}
            color="#6C63FF"
            subtitle="Active sprints"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Tasks"
            value={data?.total_tasks || 0}
            icon={<TaskIcon />}
            color="#00D9FF"
            subtitle={user?.role === 'Developer' ? `${data?.my_tasks || 0} assigned to you` : 'Across all sprints'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Bugs"
            value={data?.total_bugs || 0}
            icon={<BugIcon />}
            color="#FF5252"
            subtitle={`${data?.bugs_by_status?.Open || 0} open`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Completion"
            value={`${data?.completion_rate || 0}%`}
            icon={<TrendingIcon />}
            color="#00E676"
            subtitle="Tasks completed"
          />
        </Grid>
      </Grid>

      {/* Sprint Progress Section */}
      {sprintProgress.length > 0 && (
        <Card sx={{ mb: 4 }} className="animate-slide-up">
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
              Sprint Progress
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sprintProgress.map((sprint) => (
                <Box key={sprint.sprint_id || sprint.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {sprint.name}
                      </Typography>
                      <Chip
                        label={`Sprint ${sprint.sprint_id}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.7rem', borderRadius: 1.5 }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      {sprint.completed}/{sprint.total} tasks · {sprint.pct}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={sprint.pct}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(148, 163, 184, 0.08)'
                          : 'rgba(0, 0, 0, 0.05)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background:
                          sprint.pct >= 80
                            ? 'linear-gradient(90deg, #00C853, #00E676)'
                            : sprint.pct >= 40
                            ? 'linear-gradient(90deg, #00D9FF, #33E1FF)'
                            : 'linear-gradient(90deg, #FFB74D, #FFD180)',
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Tasks by Status - Pie Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Tasks by Status
              </Typography>
              {taskPieData.length > 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={taskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        animationBegin={200}
                        animationDuration={800}
                      >
                        {taskPieData.map((entry) => (
                          <Cell key={entry.name} fill={statusColors[entry.name] || '#666'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--tooltip-bg, #1E293B)',
                          border: '1px solid rgba(148,163,184,0.2)',
                          borderRadius: 8,
                          color: 'var(--tooltip-color, #F1F5F9)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {taskPieData.map((entry) => (
                      <Chip
                        key={entry.name}
                        label={`${entry.name}: ${entry.value}`}
                        size="small"
                        sx={{
                          background: `${statusColors[entry.name]}15`,
                          color: statusColors[entry.name],
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No task data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bugs by Status - Bar Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Bugs by Status
              </Typography>
              {bugBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bugBarData}>
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--tooltip-bg, #1E293B)',
                        border: '1px solid rgba(148,163,184,0.2)',
                        borderRadius: 8,
                        color: 'var(--tooltip-color, #F1F5F9)',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={800}>
                      {bugBarData.map((entry) => (
                        <Cell key={entry.name} fill={statusColors[entry.name] || '#666'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                  No bug data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Tasks Table */}
      <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Recent Tasks
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Task ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>Sprint</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>Assigned To</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.recent_tasks?.map((task) => (
                  <TableRow key={task.id} sx={{ '&:hover': { background: (t) => t.palette.mode === 'dark' ? 'rgba(108,99,255,0.04)' : 'rgba(91,82,224,0.03)' } }}>
                    <TableCell sx={{ fontWeight: 600 }}>{task.task_id}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Chip label={`Sprint ${task.sprint_id}`} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status}
                        size="small"
                        sx={{
                          background: `${statusColors[task.status]}20`,
                          color: statusColors[task.status],
                          fontWeight: 600,
                          borderRadius: 1.5,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>{task.assigned_to || '—'}</TableCell>
                  </TableRow>
                ))}
                {(!data?.recent_tasks || data.recent_tasks.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                      No tasks yet. Create your first sprint and task!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create Sprint Dialog */}
      <Dialog open={createSprintOpen} onClose={() => setCreateSprintOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Sprint</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Sprint Name"
              value={sprintForm.name}
              onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
              fullWidth
              placeholder="e.g., Q1 Week 1"
            />
            <TextField
              label="Duration (Days)"
              type="number"
              value={sprintForm.duration_days}
              onChange={(e) => setSprintForm({ ...sprintForm, duration_days: e.target.value })}
              fullWidth
              inputProps={{ min: 1, max: 365 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateSprintOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateSprint}>Create Sprint</Button>
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
