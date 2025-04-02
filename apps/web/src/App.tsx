import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

export const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Redirect root to admin dashboard for now */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
      </Routes>
    </Router>
  );
}; 