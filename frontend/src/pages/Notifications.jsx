import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  Chip,
  Tooltip,
  Skeleton,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Assignment as TaskAssignedIcon,
  BugReport as BugReportedIcon,
  Schedule as DeadlineIcon,
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  DoneAll as MarkAllIcon,
  NotificationsNone as EmptyIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import API from '../api/axios';
import useSocket from '../hooks/useSocket';

/* ── Helpers ──────────────────────────────────────────────── */

const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'task_assigned': return <TaskAssignedIcon sx={{ color: '#00D9FF' }} />;
    case 'bug_reported': return <BugReportedIcon sx={{ color: '#FF5252' }} />;
    case 'deadline_alert': return <DeadlineIcon sx={{ color: '#FFB74D' }} />;
    default: return <NotificationsIcon sx={{ color: '#6C63FF' }} />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case 'task_assigned': return '#00D9FF';
    case 'bug_reported': return '#FF5252';
    case 'deadline_alert': return '#FFB74D';
    default: return '#6C63FF';
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'task_assigned': return 'Task Assigned';
    case 'bug_reported': return 'Bug Reported';
    case 'deadline_alert': return 'Deadline';
    default: return 'Notification';
  }
};

/* ── Component ────────────────────────────────────────────── */

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const TAB_FILTERS = ['all', 'task_assigned', 'bug_reported', 'deadline_alert'];

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (unreadOnly) params.append('unread_only', 'true');
      const res = await API.get(`/notifications?${params.toString()}`);
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time updates
  useSocket('task_assigned', fetchNotifications);
  useSocket('bug_reported', fetchNotifications);
  useSocket('deadline_alert', fetchNotifications);

  const handleMarkAsRead = async (notifId) => {
    try {
      await API.patch(`/notifications/${notifId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (notifId) => {
    try {
      await API.delete(`/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter by tab
  const filteredNotifications =
    tabIndex === 0
      ? notifications
      : notifications.filter((n) => n.type === TAB_FILTERS[tabIndex]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={50} />
        <Skeleton variant="rounded" height={500} sx={{ mt: 2, borderRadius: 3 }} />
      </Box>
    );
  }

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Notifications
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All caught up!'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Unread only
              </Typography>
            }
          />
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MarkAllIcon />}
              onClick={handleMarkAllRead}
              sx={{ textTransform: 'none' }}
            >
              Mark all read
            </Button>
          )}
        </Box>
      </Box>

      {/* Stats chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {['task_assigned', 'bug_reported', 'deadline_alert'].map((type) => {
          const count = notifications.filter((n) => n.type === type).length;
          return (
            <Chip
              key={type}
              icon={getTypeIcon(type)}
              label={`${getTypeLabel(type)}: ${count}`}
              sx={{
                background: `${getTypeColor(type)}12`,
                color: getTypeColor(type),
                fontWeight: 600,
                border: `1px solid ${getTypeColor(type)}25`,
                px: 0.5,
              }}
            />
          );
        })}
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{
            px: 2,
            pt: 1,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
            },
          }}
        >
          <Tab label={`All (${notifications.length})`} />
          <Tab label="Tasks" />
          <Tab label="Bugs" />
          <Tab label="Deadlines" />
        </Tabs>

        <Divider />

        <CardContent sx={{ p: 0 }}>
          {filteredNotifications.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 8,
                gap: 1.5,
              }}
              className="animate-fade-in"
            >
              <EmptyIcon sx={{ fontSize: 64, color: 'text.secondary', opacity: 0.2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                No notifications
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                {unreadOnly
                  ? 'No unread notifications in this category'
                  : "You're all caught up!"}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((n, idx) => (
                <ListItem
                  key={n.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                  sx={{
                    py: 2,
                    px: 3,
                    alignItems: 'flex-start',
                    gap: 2,
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                    backgroundColor: n.is_read
                      ? 'transparent'
                      : (t) =>
                          t.palette.mode === 'dark'
                            ? `${getTypeColor(n.type)}06`
                            : `${getTypeColor(n.type)}04`,
                    borderLeft: n.is_read
                      ? '4px solid transparent'
                      : `4px solid ${getTypeColor(n.type)}`,
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      backgroundColor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.02)'
                          : 'rgba(0,0,0,0.015)',
                    },
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      {!n.is_read && (
                        <Tooltip title="Mark as read">
                          <IconButton size="small" onClick={() => handleMarkAsRead(n.id)}>
                            <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(n.id)}>
                          <DeleteIcon sx={{ fontSize: 18, color: 'text.secondary', opacity: 0.5 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `${getTypeColor(n.type)}15`,
                      }}
                    >
                      {getTypeIcon(n.type)}
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: n.is_read ? 400 : 700, fontSize: '0.95rem' }}
                        >
                          {n.title}
                        </Typography>
                        <Chip
                          label={getTypeLabel(n.type)}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: `${getTypeColor(n.type)}15`,
                            color: getTypeColor(n.type),
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            mt: 0.5,
                            fontSize: '0.85rem',
                          }}
                        >
                          {n.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: getTypeColor(n.type),
                            fontSize: '0.75rem',
                            mt: 0.5,
                            display: 'block',
                          }}
                        >
                          {formatRelativeTime(n.created_at)}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
