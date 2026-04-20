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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }
    const result = await login(username.trim(), password.trim());
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
            ? 'radial-gradient(ellipse at 20% 50%, rgba(108,99,255,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,217,255,0.08) 0%, transparent 50%), #0A0E1A'
            : 'radial-gradient(ellipse at 20% 50%, rgba(91,82,224,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,151,178,0.04) 0%, transparent 50%), #F5F7FA',
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
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Logo size={56} sx={{ mb: 2, display: 'inline-flex' }} />
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              Welcome Back
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Sign in to your Sprint Tracker account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ mb: 2.5 }}
              autoFocus
              id="login-username"
            />
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              id="login-password"
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
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              id="login-submit"
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Don't have an account?{' '}
              <Typography
                component={RouterLink}
                to="/signup"
                variant="body2"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign Up
              </Typography>
            </Typography>
          </Box>


        </CardContent>
      </Card>
    </Box>
  );
}
