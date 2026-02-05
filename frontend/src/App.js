import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Chatbot from './components/Chatbot';
import LandingPage from './components/LandingPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DepartmentDetailPage from './pages/DepartmentDetailPage';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import BookAppointmentPage from './pages/BookAppointmentPage';

/**
 * MediFlow App Component
 * Root component with routing and global medical chatbot
 * 
 * Routes:
 * - / : Landing page (clinic info, chatbot)
 * - /departments : List of medical departments
 * - /departments/:departmentId : Department details
 * - /book-appointment/:appointmentId : Appointment booking page
 * - /doctor : Doctor dashboard (patients, appointments)
 * - /doctor/patients : All patients list
 * - /doctor/patients/:id : Patient detail page
 */
function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public clinic routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:departmentId" element={<DepartmentDetailPage />} />
          <Route path="/book-appointment/:appointmentId" element={<BookAppointmentPage />} />

          {/* Doctor dashboard routes */}
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/patients" element={<PatientsPage />} />
          <Route path="/doctor/patients/:id" element={<PatientDetailPage />} />
        </Routes>

        {/* Global Medical Chatbot - Available on all pages */}
        {/* Features: Symptom checker, appointment booking, triage */}
        <Chatbot />
      </div>
    </Router>
  );
}

export default App;
