import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const animRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const numTarget = typeof target === 'string' ? parseFloat(target) : target;
    if (isNaN(numTarget)) {
      setValue(target);
      return;
    }

    const start = 0;
    const diff = numTarget - start;

    const animate = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    startRef.current = null;
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return value;
}

export default function StatCard({ title, value, icon, color = '#6C63FF', subtitle }) {
  const isPercentage = typeof value === 'string' && value.endsWith('%');
  const numericValue = isPercentage ? parseInt(value) : value;
  const animatedValue = useCountUp(numericValue);
  const displayValue = isPercentage ? `${animatedValue}%` : animatedValue;

  return (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        '&:hover': {
          transform: 'translateY(-6px)',
          boxShadow: `0 16px 48px ${color}18`,
        },
      }}
      className="animate-slide-up"
    >
      {/* Background glow circle */}
      <Box
        sx={{
          position: 'absolute',
          top: -25,
          right: -25,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: `${color}10`,
          transition: 'all 0.3s ease',
        }}
      />
      {/* Secondary smaller glow */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -15,
          left: -15,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: `${color}08`,
        }}
      />

      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.85rem' }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${color}25, ${color}10)`,
              color: color,
              transition: 'all 0.3s ease',
              boxShadow: `0 4px 12px ${color}15`,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            mb: 0.5,
            fontSize: { xs: '1.8rem', sm: '2.2rem' },
          }}
        >
          {typeof numericValue === 'number' ? displayValue : value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
