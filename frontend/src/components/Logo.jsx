import { Box } from '@mui/material';

export default function Logo({ size = 40, sx = {} }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 16px rgba(59, 130, 246, 0.25)',
        flexShrink: 0,
        ...sx
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M12 2.5L2.5 7.5L12 12.5L21.5 7.5L12 2.5Z" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          strokeLinejoin="round" 
        />
        <path 
          d="M2.5 12.5L12 17.5L21.5 12.5" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.8" 
        />
        <path 
          d="M2.5 17.5L12 22.5L21.5 17.5" 
          stroke="#FFFFFF" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.5" 
        />
      </svg>
    </Box>
  );
}
