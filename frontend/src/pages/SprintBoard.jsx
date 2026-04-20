import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  BugReport as BugIcon,
  Person as PersonIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import API from '../api/axios';
import useSocket from '../hooks/useSocket';

const COLUMNS = [
  { id: 'Pending', label: 'To Do', color: '#FFB74D', emoji: '📋' },
  { id: 'In Progress', label: 'In Progress', color: '#00D9FF', emoji: '🚀' },
  { id: 'Testing', label: 'Testing', color: '#CE93D8', emoji: '🧪' },
  { id: 'Completed', label: 'Done', color: '#00E676', emoji: '✅' },
];

/* ── Kanban Task Card (draggable) ────────────────────────── */

function TaskCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 1.5,
        cursor: 'grab',
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'rgba(17, 24, 39, 0.6)'
            : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        border: (t) =>
          `1px solid ${
            t.palette.mode === 'dark'
              ? 'rgba(148, 163, 184, 0.08)'
              : 'rgba(0, 0, 0, 0.04)'
          }`,
        boxShadow: (t) =>
          t.palette.mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.15)'
            : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: (t) =>
            `1px solid ${
              t.palette.mode === 'dark'
                ? 'rgba(108,99,255,0.3)'
                : 'rgba(91,82,224,0.2)'
            }`,
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 8px 24px rgba(108,99,255,0.12)'
              : '0 4px 16px rgba(91,82,224,0.08)',
          transform: 'translateY(-2px)',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
      {...attributes}
      {...listeners}
    >
      <Box sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Chip
            label={task.task_id}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              fontWeight: 700,
              background: 'rgba(108,99,255,0.12)',
              color: '#8B83FF',
              borderRadius: 1,
            }}
          />
          <DragIcon
            sx={{
              fontSize: 16,
              color: 'text.secondary',
              opacity: 0.3,
              transition: 'opacity 0.2s',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, mb: 1.5, lineHeight: 1.4, color: 'text.primary' }}
        >
          {task.title}
        </Typography>

        {/* Footer */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Assignee */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {task.assigned_to && task.assigned_to !== '-' ? (
              <Tooltip title={task.assigned_to}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
                  }}
                >
                  {task.assigned_to[0]?.toUpperCase()}
                </Avatar>
              </Tooltip>
            ) : (
              <Chip
                icon={<PersonIcon sx={{ fontSize: 14 }} />}
                label="Unassigned"
                size="small"
                sx={{ height: 22, fontSize: '0.65rem', opacity: 0.5 }}
                variant="outlined"
              />
            )}
          </Box>

          {/* Bug count */}
          {task.bug_count > 0 && (
            <Chip
              icon={<BugIcon sx={{ fontSize: 14 }} />}
              label={task.bug_count}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.65rem',
                background: 'rgba(255,82,82,0.12)',
                color: '#FF5252',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Sprint badge */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
            Sprint {task.sprint_id} · {task.sprint_name}
          </Typography>
        </Box>
      </Box>
    </Card>
  );
}

/* ── Overlay card shown while dragging ───────────────────── */

function DragOverlayCard({ task }) {
  if (!task) return null;
  return (
    <Card
      sx={{
        width: 270,
        p: 2,
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'rgba(108,99,255,0.2)'
            : 'rgba(91,82,224,0.1)',
        backdropFilter: 'blur(20px)',
        border: '2px solid rgba(108,99,255,0.5)',
        boxShadow: '0 24px 64px rgba(108,99,255,0.3)',
        cursor: 'grabbing',
        transform: 'rotate(2deg) scale(1.03)',
      }}
    >
      <Chip
        label={task.task_id}
        size="small"
        sx={{ mb: 1, fontSize: '0.7rem', fontWeight: 700 }}
      />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {task.title}
      </Typography>
      {task.assigned_to && task.assigned_to !== '-' && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          → {task.assigned_to}
        </Typography>
      )}
    </Card>
  );
}

/* ── SprintBoard ─────────────────────────────────────────── */

export default function SprintBoard() {
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumn, setActiveColumn] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, sprintsRes] = await Promise.all([
        API.get('/tasks/all'),
        API.get('/sprints'),
      ]);
      setTasks(tasksRes.data);
      setSprints(sprintsRes.data);
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates
  useSocket('task_created', fetchData);
  useSocket('task_updated', fetchData);
  useSocket('task_deleted', fetchData);
  useSocket('task_assigned', fetchData);

  // Filter tasks by selected sprint
  const filteredTasks = selectedSprint === 'all'
    ? tasks
    : tasks.filter((t) => t.sprint_id === selectedSprint);

  // Group tasks by status column
  const getColumnTasks = (status) =>
    filteredTasks.filter((t) => t.status === status);

  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id.toString() === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (!over) {
      setActiveColumn(null);
      return;
    }

    // Determine which column is being hovered
    const overColumn = COLUMNS.find((col) => col.id === over.id);
    if (overColumn) {
      setActiveColumn(overColumn.id);
    } else {
      const overTask = tasks.find((t) => t.id.toString() === over.id);
      if (overTask) {
        setActiveColumn(overTask.status);
      }
    }
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    setActiveColumn(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const task = tasks.find((t) => t.id.toString() === taskId);
    if (!task) return;

    // Find which column was dropped into
    const overColumn = COLUMNS.find((col) => col.id === over.id);
    let newStatus;

    if (overColumn) {
      newStatus = overColumn.id;
    } else {
      // Dropped on another card — find that card's column
      const overTask = tasks.find((t) => t.id.toString() === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (!newStatus || newStatus === task.status) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id.toString() === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      await API.patch(`/tasks/${task.id}/status`, { status: newStatus });
      setSnackbar({
        open: true,
        message: `Task "${task.title}" moved to ${newStatus}`,
        severity: 'success',
      });
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id.toString() === taskId ? { ...t, status: task.status } : t
        )
      );
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update task status',
        severity: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} />
        <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" width={280} height={500} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Sprint Board
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Drag and drop tasks between columns to update their status
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Sprint</InputLabel>
          <Select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            label="Filter by Sprint"
          >
            <MenuItem value="all">All Sprints</MenuItem>
            {sprints.map((s) => (
              <MenuItem key={s.sprint_id} value={s.sprint_id}>
                Sprint {s.sprint_id} — {s.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2.5,
            overflowX: 'auto',
            pb: 2,
            minHeight: 500,
            scrollSnapType: { xs: 'x mandatory', md: 'none' },
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {COLUMNS.map((column) => {
            const columnTasks = getColumnTasks(column.id);
            const isActiveCol = activeColumn === column.id;

            return (
              <SortableContext
                key={column.id}
                id={column.id}
                items={columnTasks.map((t) => t.id.toString())}
                strategy={verticalListSortingStrategy}
              >
                <Box
                  sx={{
                    minWidth: { xs: 280, sm: 280 },
                    maxWidth: 320,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    scrollSnapAlign: { xs: 'start', md: 'none' },
                  }}
                >
                  {/* Column Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 2,
                      px: 1,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.1rem' }}>{column.emoji}</Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, color: 'text.primary' }}
                    >
                      {column.label}
                    </Typography>
                    <Chip
                      label={columnTasks.length}
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: `${column.color}18`,
                        color: column.color,
                        ml: 'auto',
                        transition: 'all 0.3s ease',
                        ...(isActiveCol && {
                          background: `${column.color}30`,
                          transform: 'scale(1.1)',
                        }),
                      }}
                    />
                  </Box>

                  {/* Column Body — droppable area */}
                  <Box
                    id={column.id}
                    sx={{
                      flex: 1,
                      borderRadius: 3,
                      p: 1.5,
                      minHeight: 200,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: isActiveCol
                        ? (t) =>
                            t.palette.mode === 'dark'
                              ? `${column.color}0A`
                              : `${column.color}06`
                        : (t) =>
                            t.palette.mode === 'dark'
                              ? `${column.color}05`
                              : `${column.color}03`,
                      border: isActiveCol
                        ? `2px dashed ${column.color}40`
                        : (t) =>
                            `1px dashed ${
                              t.palette.mode === 'dark'
                                ? 'rgba(148,163,184,0.1)'
                                : 'rgba(0,0,0,0.06)'
                            }`,
                      boxShadow: isActiveCol
                        ? `0 0 24px ${column.color}12`
                        : 'none',
                    }}
                    className={isActiveCol ? 'drop-zone-pulse' : ''}
                  >
                    {columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                    {columnTasks.length === 0 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 120,
                          opacity: 0.3,
                          gap: 0.5,
                        }}
                      >
                        <Typography sx={{ fontSize: '1.5rem' }}>{column.emoji}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                          No tasks
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                          Drop tasks here
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </SortableContext>
            );
          })}
        </Box>

        <DragOverlay>
          <DragOverlayCard task={activeTask} />
        </DragOverlay>
      </DndContext>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
