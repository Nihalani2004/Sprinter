import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  IconButton,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  RocketLaunch,
  BugReport,
  ViewKanban,
  Notifications,
  Speed,
  Groups,
  Menu as MenuIcon,
  Close as CloseIcon,
  ArrowForward,
  DarkMode,
  LightMode,
  Check,
} from '@mui/icons-material';
import Logo from '../components/Logo';
import { useThemeMode } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

/* ────────────────────────── Intersection Observer Hook ─── */
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

/* ────────────────────────── Animated Section Wrapper ──── */
function AnimatedSection({ children, delay = 0, sx = {} }) {
  const [ref, inView] = useInView();
  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}ms, transform 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/* ────────────────────────── Floating Particles BG ──────── */
function FloatingParticles() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: 3 + Math.random() * 5,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 6,
    duration: 8 + Math.random() * 10,
  }));
  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {particles.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: isDark
              ? `rgba(108, 99, 255, ${0.12 + Math.random() * 0.18})`
              : `rgba(91, 82, 224, ${0.08 + Math.random() * 0.12})`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animation: `landingFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
    </Box>
  );
}

/* ────────────────────────── Feature Card ───────────────── */
function FeatureCard({ icon, title, description, delay = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <AnimatedSection delay={delay}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          height: '100%',
          background: isDark
            ? 'rgba(17, 24, 39, 0.5)'
            : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: isDark
            ? '1px solid rgba(148, 163, 184, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.05)',
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          cursor: 'default',
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: isDark
              ? '0 20px 48px rgba(108, 99, 255, 0.15)'
              : '0 16px 40px rgba(91, 82, 224, 0.1)',
            border: isDark
              ? '1px solid rgba(108, 99, 255, 0.25)'
              : '1px solid rgba(91, 82, 224, 0.18)',
          },
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2.5,
            background: isDark
              ? 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(0,217,255,0.08) 100%)'
              : 'linear-gradient(135deg, rgba(91,82,224,0.1) 0%, rgba(0,151,178,0.06) 100%)',
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 1,
            fontSize: '1.1rem',
            color: 'text.primary',
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.7,
            fontSize: '0.9rem',
          }}
        >
          {description}
        </Typography>
      </Box>
    </AnimatedSection>
  );
}

/* ────────────────────────── Stat Item ──────────────────── */
function StatItem({ value, label, delay = 0 }) {
  const theme = useTheme();
  return (
    <AnimatedSection delay={delay}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: { xs: '2.2rem', md: '2.8rem' },
            fontWeight: 800,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #6C63FF, #00D9FF)'
              : 'linear-gradient(135deg, #5B52E0, #0097B2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500 }}
        >
          {label}
        </Typography>
      </Box>
    </AnimatedSection>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { toggleTheme } = useThemeMode();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const features = [
    {
      icon: <ViewKanban sx={{ fontSize: 28, color: 'primary.main' }} />,
      title: 'Sprint Management',
      description:
        'Organize work into time-boxed sprints with drag-and-drop Kanban boards. Track velocity and progress in real time.',
    },
    {
      icon: <RocketLaunch sx={{ fontSize: 28, color: 'secondary.main' }} />,
      title: 'Task Tracking',
      description:
        'Create, assign, and track tasks with customizable status flows from To-Do through Development to Done.',
    },
    {
      icon: <BugReport sx={{ fontSize: 28, color: 'error.main' }} />,
      title: 'Bug Tracking',
      description:
        'Log and manage bugs per task with full lifecycle tracking — Open, Fixed, Verified, and Closed.',
    },
    {
      icon: <Groups sx={{ fontSize: 28, color: 'success.main' }} />,
      title: 'Team Collaboration',
      description:
        'Role-based access for Managers, Developers, and Testers with isolated data views and permissions.',
    },
    {
      icon: <Notifications sx={{ fontSize: 28, color: 'warning.main' }} />,
      title: 'Real-Time Updates',
      description:
        'Instant notifications via WebSockets keep your entire team in sync. Never miss a status change.',
    },
    {
      icon: <Speed sx={{ fontSize: 28, color: 'primary.light' }} />,
      title: 'Dashboard Analytics',
      description:
        'Visual analytics with charts and stats — monitor sprint health, task distribution, and team productivity.',
    },
  ];

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
  ];

  const handleNavClick = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: isDark
          ? 'radial-gradient(ellipse at 20% 0%, rgba(108,99,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0,217,255,0.05) 0%, transparent 50%), #0A0E1A'
          : 'radial-gradient(ellipse at 20% 0%, rgba(91,82,224,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0,151,178,0.03) 0%, transparent 50%), #F5F7FA',
        overflowX: 'hidden',
      }}
    >
      {/* ── Inject keyframes ── */}
      <style>{`
        @keyframes landingFloat {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
          100% { transform: translate(20px, -30px) scale(1.3); opacity: 0.2; }
        }
        @keyframes heroGlow {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* ═══════════ NAVBAR ═══════════ */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          py: scrolled ? 1.5 : 2,
          px: { xs: 2, md: 4 },
          background: scrolled
            ? isDark
              ? 'rgba(10, 14, 26, 0.85)'
              : 'rgba(245, 247, 250, 0.85)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled
            ? isDark
              ? '1px solid rgba(148,163,184,0.08)'
              : '1px solid rgba(0,0,0,0.05)'
            : '1px solid transparent',
          transition: 'all 0.35s ease',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo + Title */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                '&:hover': { opacity: 0.85 },
                transition: 'opacity 0.2s',
              }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Logo size={38} />
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.2rem' }}>
                Sprint Tracker
              </Typography>
            </Box>

            {/* Desktop Nav */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {navLinks.map((link) => (
                  <Button
                    key={link.label}
                    onClick={() => handleNavClick(link.href)}
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      px: 2,
                      '&:hover': { color: 'primary.main', background: 'transparent' },
                    }}
                  >
                    {link.label}
                  </Button>
                ))}

                <IconButton onClick={toggleTheme} size="small" sx={{ ml: 1, color: 'text.secondary' }}>
                  {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </IconButton>

                <Button
                  variant="text"
                  onClick={() => navigate('/login')}
                  sx={{
                    ml: 1,
                    color: 'text.primary',
                    fontWeight: 600,
                    '&:hover': { background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' },
                  }}
                  id="nav-login-btn"
                >
                  Log In
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate('/signup')}
                  sx={{
                    ml: 0.5,
                    background: isDark
                      ? 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)'
                      : 'linear-gradient(135deg, #5B52E0 0%, #7C73FF 100%)',
                    px: 3,
                    '&:hover': {
                      boxShadow: isDark
                        ? '0 6px 24px rgba(108,99,255,0.4)'
                        : '0 6px 24px rgba(91,82,224,0.3)',
                    },
                  }}
                  id="nav-signup-btn"
                >
                  Sign Up
                </Button>
              </Box>
            )}

            {/* Mobile Hamburger */}
            {isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton onClick={toggleTheme} size="small" sx={{ color: 'text.secondary' }}>
                  {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
                </IconButton>
                <IconButton onClick={() => setMobileOpen(true)} sx={{ color: 'text.primary' }}>
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: isDark ? '#0D1117' : '#FFFFFF',
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <IconButton onClick={() => setMobileOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navLinks.map((link) => (
            <ListItem
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              sx={{ cursor: 'pointer', borderRadius: 2, '&:hover': { background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' } }}
            >
              <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5, px: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => { setMobileOpen(false); navigate('/login'); }}
            sx={{ borderColor: 'primary.main', color: 'primary.main' }}
          >
            Log In
          </Button>
          <Button
            variant="contained"
            fullWidth
            onClick={() => { setMobileOpen(false); navigate('/signup'); }}
          >
            Sign Up
          </Button>
        </Box>
      </Drawer>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 16, md: 20 },
          pb: { xs: 10, md: 14 },
        }}
      >
        <FloatingParticles />

        {/* Hero glow orb */}
        <Box
          sx={{
            position: 'absolute',
            width: { xs: 300, md: 500 },
            height: { xs: 300, md: 500 },
            borderRadius: '50%',
            background: isDark
              ? 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(91,82,224,0.08) 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'heroGlow 4s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <AnimatedSection>
            <Box sx={{ textAlign: 'center' }}>
              {/* Badge */}
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2.5,
                  py: 0.8,
                  borderRadius: 50,
                  mb: 4,
                  background: isDark
                    ? 'rgba(108,99,255,0.1)'
                    : 'rgba(91,82,224,0.07)',
                  border: isDark
                    ? '1px solid rgba(108,99,255,0.2)'
                    : '1px solid rgba(91,82,224,0.15)',
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#00E676',
                    boxShadow: '0 0 8px rgba(0,230,118,0.5)',
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main', letterSpacing: 0.5 }}>
                  Open Source Project Management
                </Typography>
              </Box>

              {/* Headline */}
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.4rem', sm: '3.2rem', md: '4rem' },
                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  mb: 3,
                }}
              >
                Ship Faster with{' '}
                <Box
                  component="span"
                  sx={{
                    background: isDark
                      ? 'linear-gradient(135deg, #6C63FF 0%, #00D9FF 100%)'
                      : 'linear-gradient(135deg, #5B52E0 0%, #0097B2 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'gradientShift 4s ease infinite',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Agile Sprints
                </Box>
              </Typography>

              {/* Subheadline */}
              <Typography
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                  maxWidth: 560,
                  mx: 'auto',
                  lineHeight: 1.7,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  mb: 5,
                }}
              >
                Plan sprints, track tasks, squash bugs, and keep your team aligned —
                all in one streamlined workspace built for modern development teams.
              </Typography>

              {/* CTA Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/signup')}
                  id="hero-get-started-btn"
                  sx={{
                    px: 4,
                    py: 1.7,
                    fontSize: '1rem',
                    background: isDark
                      ? 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)'
                      : 'linear-gradient(135deg, #5B52E0 0%, #7C73FF 100%)',
                    '&:hover': {
                      boxShadow: isDark
                        ? '0 8px 32px rgba(108,99,255,0.45)'
                        : '0 8px 32px rgba(91,82,224,0.35)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  id="hero-login-btn"
                  sx={{
                    px: 4,
                    py: 1.7,
                    fontSize: '1rem',
                    borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(0,0,0,0.15)',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: 'primary.main',
                      background: isDark ? 'rgba(108,99,255,0.06)' : 'rgba(91,82,224,0.04)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Log In
                </Button>
              </Box>
            </Box>
          </AnimatedSection>
        </Container>
      </Box>

      {/* ═══════════ TRUSTED STATS ═══════════ */}
      <Box sx={{ py: { xs: 6, md: 8 } }}>
        <Container maxWidth="md">
          <Grid container spacing={4} justifyContent="center">
            {[
              { value: '3', label: 'Role-Based Views' },
              { value: '∞', label: 'Sprints & Tasks' },
              { value: 'Live', label: 'Real-Time Sync' },
              { value: '100%', label: 'Open Source' },
            ].map((stat, i) => (
              <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                <StatItem value={stat.value} label={stat.label} delay={i * 120} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════ FEATURES SECTION ═══════════ */}
      <Box id="features" sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  letterSpacing: 2,
                  mb: 1.5,
                  display: 'block',
                }}
              >
                FEATURES
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  mb: 2,
                  fontSize: { xs: '1.8rem', md: '2.4rem' },
                }}
              >
                Everything You Need to Deliver
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  maxWidth: 520,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                From sprint planning to bug tracking, Sprint Tracker brings your team's workflow
                together in one elegant, real-time platform.
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={3}>
            {features.map((f, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.title}>
                <FeatureCard {...f} delay={i * 100} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <Box
        id="how-it-works"
        sx={{
          py: { xs: 8, md: 12 },
          background: isDark
            ? 'linear-gradient(180deg, rgba(108,99,255,0.03) 0%, transparent 100%)'
            : 'linear-gradient(180deg, rgba(91,82,224,0.02) 0%, transparent 100%)',
        }}
      >
        <Container maxWidth="md">
          <AnimatedSection>
            <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
              <Typography
                variant="overline"
                sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: 2, mb: 1.5, display: 'block' }}
              >
                HOW IT WORKS
              </Typography>
              <Typography
                variant="h3"
                sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: { xs: '1.8rem', md: '2.4rem' } }}
              >
                Three Steps to Ship
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4}>
            {[
              { step: '01', title: 'Create Sprints', desc: 'Define time-boxed iterations, set goals, and organize your roadmap into manageable chunks.' },
              { step: '02', title: 'Assign & Track', desc: 'Create tasks, assign them to developers, and track progress through customizable status workflows.' },
              { step: '03', title: 'Test & Ship', desc: 'Testers log bugs, developers fix them, and managers oversee everything on a live dashboard.' },
            ].map((item, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={item.step}>
                <AnimatedSection delay={i * 150}>
                  <Box sx={{ textAlign: 'center', px: 2 }}>
                    <Typography
                      sx={{
                        fontSize: '3rem',
                        fontWeight: 800,
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(0,217,255,0.15))'
                          : 'linear-gradient(135deg, rgba(91,82,224,0.2), rgba(0,151,178,0.1))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 2,
                      }}
                    >
                      {item.step}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                      {item.desc}
                    </Typography>
                  </Box>
                </AnimatedSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ═══════════ CTA SECTION ═══════════ */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="sm">
          <AnimatedSection>
            <Box
              sx={{
                textAlign: 'center',
                p: { xs: 4, md: 6 },
                borderRadius: 5,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(0,217,255,0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(91,82,224,0.06) 0%, rgba(0,151,178,0.03) 100%)',
                border: isDark
                  ? '1px solid rgba(108,99,255,0.15)'
                  : '1px solid rgba(91,82,224,0.1)',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Ready to Accelerate Your Team?
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.7 }}
              >
                Start tracking sprints, managing tasks, and shipping better software — today.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/signup')}
                  id="cta-signup-btn"
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: isDark
                      ? 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)'
                      : 'linear-gradient(135deg, #5B52E0 0%, #7C73FF 100%)',
                    '&:hover': {
                      boxShadow: isDark
                        ? '0 8px 32px rgba(108,99,255,0.45)'
                        : '0 8px 32px rgba(91,82,224,0.35)',
                    },
                  }}
                >
                  Create Free Account
                </Button>
              </Box>

              {/* Trust indicators */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 3, flexWrap: 'wrap' }}>
                {['No credit card', 'Free forever', 'Instant setup'].map((item) => (
                  <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Check sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </AnimatedSection>
        </Container>
      </Box>

      {/* ═══════════ FOOTER ═══════════ */}
      <Box
        component="footer"
        sx={{
          py: { xs: 4, md: 5 },
          borderTop: isDark
            ? '1px solid rgba(148,163,184,0.08)'
            : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            {/* Footer Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Logo size={32} />
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                Sprint Tracker
              </Typography>
            </Box>

            {/* Footer Links */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
              {navLinks.map((link) => (
                <Typography
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' },
                    transition: 'color 0.2s',
                  }}
                >
                  {link.label}
                </Typography>
              ))}
              <Typography
                onClick={() => navigate('/login')}
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.2s',
                }}
              >
                Log In
              </Typography>
              <Typography
                onClick={() => navigate('/signup')}
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                  transition: 'color 0.2s',
                }}
              >
                Sign Up
              </Typography>
            </Box>

            {/* Copyright */}
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: { xs: 'center', md: 'right' } }}>
              © {new Date().getFullYear()} Sprint Tracker. Built for agile teams.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
