import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Signup() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim() || !role) {
      setError('All fields are required');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await signup(username.trim(), password, role);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (t) =>
          t.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 80% 50%, rgba(0,217,255,0.1) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(108,99,255,0.1) 0%, transparent 50%), #0A0E1A'
            : 'radial-gradient(ellipse at 80% 50%, rgba(0,151,178,0.05) 0%, transparent 60%), radial-gradient(ellipse at 20% 80%, rgba(91,82,224,0.05) 0%, transparent 50%), #F5F7FA',
        p: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          background: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(17, 24, 39, 0.7)'
              : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(40px)',
          border: (t) =>
            t.palette.mode === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.1)'
              : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 20px 60px rgba(0,0,0,0.5)'
              : '0 12px 40px rgba(0,0,0,0.08)',
        }}
        className="animate-scale-in"
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Logo size={56} sx={{ mb: 2, display: 'inline-flex' }} />
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Join the Sprint Tracker team
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
              id="signup-username"
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                label="Role"
                id="signup-role"
                sx={{ borderRadius: 2.5 }}
              >
                <MenuItem value="Manager">Manager</MenuItem>
                <MenuItem value="Developer">Developer</MenuItem>
                <MenuItem value="Tester">Tester</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              id="signup-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3 }}
              id="signup-confirm-password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              id="signup-submit"
              sx={{
                py: 1.5,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #00D9FF 0%, #6C63FF 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00B8D4 0%, #5A52E0 100%)',
                  boxShadow: '0 8px 30px rgba(0,217,255,0.4)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Already have an account?{' '}
              <Typography
                component={RouterLink}
                to="/login"
                variant="body2"
                sx={{
                  color: 'secondary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign In
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
