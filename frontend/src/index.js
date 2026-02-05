import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * MediFlow React Entry Point
 * Renders the main App component into the DOM
 * 
 * Features:
 * - Patient consultation chatbot
 * - Appointment booking system
 * - AI-powered triage
 * - Doctor/Patient dashboards
 */

// Get root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element. Make sure index.html has a div with id="root"');
}

// Create React root and render App
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Log app initialization
console.log('🏥 MediFlow initialized');
console.log('Environment:', import.meta.env.MODE);
console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:5050');
