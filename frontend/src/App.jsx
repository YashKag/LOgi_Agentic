import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewResearch from './pages/NewResearch';
import Report from './pages/Report';
import DocumentQA from './pages/DocumentQA';

// Add this to properly configure the font if you don't have it locally
// This will normally go in index.html, but putting it here for simplicity
const insertFonts = () => {
    if (!document.getElementById('google-fonts')) {
      const link = document.createElement('link');
      link.id = 'google-fonts';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  };
insertFonts();

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new" element={<NewResearch />} />
          <Route path="documents" element={<DocumentQA />} />
          <Route path="report/:id" element={<Report />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
