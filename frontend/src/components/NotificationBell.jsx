import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Assignment as TaskAssignedIcon,
  BugReport as BugReportedIcon,
  Schedule as DeadlineIcon,
  NotificationsNone as EmptyIcon,
  DoneAll as MarkAllIcon,
} from '@mui/icons-material';
import API from '../api/axios';
import { connectSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';

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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'task_assigned':
      return <TaskAssignedIcon sx={{ fontSize: 20, color: '#00D9FF' }} />;
    case 'bug_reported':
      return <BugReportedIcon sx={{ fontSize: 20, color: '#FF5252' }} />;
    case 'deadline_alert':
      return <DeadlineIcon sx={{ fontSize: 20, color: '#FFB74D' }} />;
    default:
      return <NotificationsIcon sx={{ fontSize: 20, color: '#6C63FF' }} />;
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

/* ── Component ────────────────────────────────────────────── */

export default function NotificationBell() {
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [bellAnimating, setBellAnimating] = useState(false);
  const bellRef = useRef(null);

  const TAB_FILTERS = ['all', 'task_assigned', 'bug_reported', 'deadline_alert'];

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/notifications?limit=20');
      setNotifications(res.data);
      const countRes = await API.get('/notifications/unread-count');
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      const socket = connectSocket();
      socket.emit('join_user_room', { user_id: user.id });

      const handleNewNotification = () => {
        fetchNotifications();
        // Trigger bell ring animation
        setBellAnimating(true);
        setTimeout(() => setBellAnimating(false), 700);
      };

      socket.on('task_assigned', handleNewNotification);
      socket.on('bug_reported', handleNewNotification);
      socket.on('deadline_alert', handleNewNotification);

      return () => {
        socket.off('task_assigned', handleNewNotification);
        socket.off('bug_reported', handleNewNotification);
        socket.off('deadline_alert', handleNewNotification);
      };
    }
  }, [user, fetchNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const handleMarkAsRead = async (notifId, e) => {
    e?.stopPropagation();
    try {
      await API.patch(`/notifications/${notifId}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (notifId, e) => {
    e?.stopPropagation();
    try {
      await API.delete(`/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      // Also decrease unread if it was unread
      const wasUnread = notifications.find((n) => n.id === notifId && !n.is_read);
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter by tab
  const filteredNotifications =
    tabIndex === 0
      ? notifications
      : notifications.filter((n) => n.type === TAB_FILTERS[tabIndex]);

  return (
    <>
      <IconButton
        ref={bellRef}
        color="inherit"
        onClick={handleClick}
        sx={{
          backgroundColor: 'rgba(108,99,255,0.08)',
          '&:hover': { backgroundColor: 'rgba(108,99,255,0.16)' },
          transition: 'all 0.2s ease',
        }}
        className={bellAnimating ? 'animate-bell-ring' : ''}
      >
        <Badge
          badgeContent={unreadCount}
          color="error"
          overlap="circular"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.65rem',
              height: 18,
              minWidth: 18,
              fontWeight: 700,
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: { xs: 320, sm: 400 },
            maxHeight: 520,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton size="small" onClick={handleMarkAllRead}>
                <MarkAllIcon fontSize="small" sx={{ color: 'primary.main' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            px: 1,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'none',
              py: 0.5,
            },
          }}
        >
          <Tab label="All" />
          <Tab label="Tasks" />
          <Tab label="Bugs" />
          <Tab label="Deadlines" />
        </Tabs>

        <Divider />

        {/* List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                py: 5,
                px: 3,
                gap: 1,
              }}
              className="animate-fade-in"
            >
              <EmptyIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                No notifications
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredNotifications.map((n, idx) => (
                <ListItem
                  key={n.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                  sx={{
                    py: 1.5,
                    px: 2,
                    alignItems: 'flex-start',
                    gap: 1.5,
                    backgroundColor: n.is_read
                      ? 'transparent'
                      : (t) =>
                          t.palette.mode === 'dark'
                            ? `${getTypeColor(n.type)}08`
                            : `${getTypeColor(n.type)}06`,
                    borderLeft: n.is_read
                      ? '3px solid transparent'
                      : `3px solid ${getTypeColor(n.type)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: (t) =>
                        t.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.03)'
                          : 'rgba(0,0,0,0.02)',
                    },
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                      {!n.is_read && (
                        <Tooltip title="Mark as read">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            sx={{ p: 0.3 }}
                          >
                            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={(e) => handleDelete(n.id, e)}
                          sx={{ p: 0.3 }}
                        >
                          <CloseIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.5 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemIcon sx={{ minWidth: 32, mt: 0.3 }}>
                    {getTypeIcon(n.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={n.title}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{ color: 'text.secondary', display: 'block', fontSize: '0.8rem' }}
                        >
                          {n.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: getTypeColor(n.type), fontSize: '0.7rem', mt: 0.3 }}
                        >
                          {formatRelativeTime(n.created_at)}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      variant: 'subtitle2',
                      fontWeight: n.is_read ? 400 : 700,
                      fontSize: '0.85rem',
                      sx: { mb: 0.2 },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </>
  );
}
