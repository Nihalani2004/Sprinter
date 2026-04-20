import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: (t) => t.palette.background.default,
        textAlign: 'center',
        p: 3,
      }}
      className="animate-fade-in"
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '5rem', sm: '8rem' },
          fontWeight: 900,
          background: 'linear-gradient(135deg, #6C63FF, #00D9FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          mb: 1,
        }}
      >
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/dashboard')}
        sx={{ px: 4, py: 1.5 }}
      >
        Back to Dashboard
      </Button>
    </Box>
  );
}
