// CRM/frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken } from '../api/auth';

// Usage: <ProtectedRoute><YourComponent/></ProtectedRoute>
function ProtectedRoute({ children }) {
    const token = getToken();
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

export default ProtectedRoute;
