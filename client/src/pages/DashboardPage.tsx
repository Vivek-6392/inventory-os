import React from 'react';
import { Box, Typography } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Dashboard content will be built in Session 7.
      </Typography>
    </Box>
  );
};

export default DashboardPage;
