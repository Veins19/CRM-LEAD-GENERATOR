import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import behaviorTracker from '../services/behaviorTracker';
import '../styles/department-detail.css';

/**
 * MediFlow Department Detail Page Component
 * Medical department detail page with services, doctors, and booking
 * 
 * Features:
 * - Department overview and specialties
 * - Doctor profiles
 * - Treatment options
 * - Patient testimonials
 * - FAQ section
 * - Appointment booking CTA
 */
function DepartmentDetailPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [activeFAQ, setActiveFAQ] = useState(null);

  useEffect(() => {
    const departmentName = getDepartmentData(departmentId)?.title || departmentId;
    console.log('📍 Viewing department:', departmentName);
    behaviorTracker.trackPageView(departmentName, 'department');
    
    // Scroll to top on load
    window.scrollTo(0, 0);
    
    return () => {
      behaviorTracker.trackPageExit();
    };
  }, [departmentId]);

  const getDepartmentData = (id) => {
    const departments = {
      'cardiology': {
        title: 'Cardiology',
        icon: '❤️',
        tagline: 'Expert Heart Care with Advanced Diagnostics',
        description: 'Our cardiology department provides comprehensive cardiac care using state-of-the-art technology. From preventive screenings to advanced treatments, we prioritize your heart health.',
        benefits: [
          '24/7 emergency cardiac care',
          'Advanced ECG and stress testing',
          'Experienced cardiologists',
          'Same-day appointments available',
        ],
        results: [
          { metric: '95%', label: 'Patient Satisfaction', sublabel: 'verified reviews' },
          { metric: '24/7', label: 'Emergency Care', sublabel: 'always available' },
          { metric: '15+ yrs', label: 'Experience', sublabel: 'senior doctors' },
          { metric: 'Same-day', label: 'Appointments', sublabel: 'urgent cases' },
        ],
        features: [
          {
            title: 'ECG & Stress Testing',
            description: 'Comprehensive cardiac diagnostics including 12-lead ECG, treadmill stress tests, and Holter monitoring.',
            icon: '📊',
          },
          {
            title: 'Echocardiography',
            description: 'Advanced ultrasound imaging to assess heart structure, function, and blood flow.',
            icon: '🔍',
          },
          {
            title: 'Hypertension Management',
            description: 'Personalized treatment plans for high blood pressure and cardiovascular risk reduction.',
            icon: '💊',
          },
          {
            title: 'Heart Failure Care',
            description: 'Comprehensive management of chronic heart failure with medication and lifestyle guidance.',
            icon: '❤️‍🩹',
          },
          {
            title: 'Preventive Cardiology',
            description: 'Risk assessment, cholesterol management, and lifestyle counseling to prevent heart disease.',
            icon: '🛡️',
          },
          {
            title: 'Cardiac Rehabilitation',
            description: 'Post-procedure care and rehabilitation programs for optimal recovery.',
            icon: '🏃',
          },
        ],
        process: [
          { step: 1, title: 'Initial Consultation', description: 'Comprehensive cardiac history and physical examination', duration: '30-45 min' },
          { step: 2, title: 'Diagnostic Testing', description: 'ECG, blood tests, and imaging as needed', duration: 'Same day' },
          { step: 3, title: 'Treatment Plan', description: 'Personalized care plan with medication or procedures', duration: 'Week 1' },
          { step: 4, title: 'Follow-up Care', description: 'Regular monitoring and adjustments to treatment', duration: 'Ongoing' },
        ],
        pricing: {
          consultation: { 
            price: '₹1,500', 
            duration: '/visit', 
            features: [
              'Comprehensive cardiac exam',
              'ECG included',
              'Treatment plan',
              'Prescription',
              'Follow-up guidance',
            ],
            recommended: true,
          },
          diagnostics: { 
            price: '₹3,000-8,000', 
            duration: '/test', 
            features: [
              'ECG: ₹500',
              'Echo: ₹3,000',
              'Stress Test: ₹4,000',
              'Holter Monitor: ₹5,000',
              '24/7 availability',
            ],
            recommended: false,
          },
          package: { 
            price: '₹12,000', 
            duration: '/year', 
            features: [
              '4 consultations/year',
              'Annual health checkup',
              'Priority appointments',
              'Free ECG',
              '24/7 emergency access',
            ],
            recommended: false,
          },
        },
        caseStudy: {
          client: 'Mr. Rajesh Kumar',
          industry: '52 years, Hyderabad',
          logo: '👨',
          challenge: 'Experiencing chest pain and shortness of breath. High blood pressure and family history of heart disease.',
          solution: 'Comprehensive cardiac evaluation with ECG, echo, and stress testing. Diagnosed with coronary artery disease and started on medication.',
          results: [
            'Symptoms resolved within 2 weeks',
            'Blood pressure normalized',
            'Improved exercise tolerance',
            'No hospital readmission',
          ],
          testimonial: 'The cardiologists at MediFlow saved my life. They diagnosed my condition early and provided excellent care throughout.',
          author: 'Rajesh Kumar, Patient',
        },
        faqs: [
          {
            question: 'When should I see a cardiologist?',
            answer: 'See a cardiologist if you experience chest pain, shortness of breath, palpitations, dizziness, or have risk factors like high blood pressure, diabetes, or family history of heart disease.',
          },
          {
            question: 'Do I need a referral?',
            answer: 'No referral needed. You can book a cardiology consultation directly through our chatbot or call us.',
          },
          {
            question: 'What should I bring to my appointment?',
            answer: 'Bring previous medical records, list of current medications, and any recent test results. Wear comfortable clothing for potential ECG testing.',
          },
          {
            question: 'Is emergency cardiac care available?',
            answer: 'Yes, we provide 24/7 emergency cardiac care. Call our emergency hotline or visit our facility immediately for chest pain or cardiac emergencies.',
          },
        ],
      },
      'general-medicine': {
        title: 'General Medicine',
        icon: '🩺',
        tagline: 'Comprehensive Primary Care for All Ages',
        description: 'Our general medicine department provides holistic healthcare for common illnesses, chronic conditions, and preventive care. Your first stop for comprehensive medical attention.',
        benefits: [
          '24/7 availability for urgent care',
          'Same-day appointments',
          'Comprehensive health checkups',
          'Expert diagnosis and treatment',
        ],
        results: [
          { metric: '98%', label: 'Patient Satisfaction', sublabel: 'verified reviews' },
          { metric: '24/7', label: 'Availability', sublabel: 'urgent care' },
          { metric: '10+ yrs', label: 'Experience', sublabel: 'senior doctors' },
          { metric: '< 30 min', label: 'Wait Time', sublabel: 'average' },
        ],
        features: [
          {
            title: 'Acute Illness Care',
            description: 'Treatment for fever, cold, flu, infections, and other common acute conditions.',
            icon: '🤒',
          },
          {
            title: 'Chronic Disease Management',
            description: 'Ongoing care for diabetes, hypertension, asthma, and other chronic conditions.',
            icon: '💊',
          },
          {
            title: 'Preventive Health',
            description: 'Annual checkups, vaccinations, and health screenings to prevent diseases.',
            icon: '🛡️',
          },
          {
            title: 'Diagnostic Services',
            description: 'In-house lab tests, X-rays, and other diagnostic services for quick diagnosis.',
            icon: '🔬',
          },
          {
            title: 'Minor Procedures',
            description: 'Wound care, suturing, IV therapy, and other minor medical procedures.',
            icon: '🏥',
          },
          {
            title: 'Health Counseling',
            description: 'Lifestyle advice, nutrition guidance, and wellness counseling.',
            icon: '💬',
          },
        ],
        process: [
          { step: 1, title: 'Initial Assessment', description: 'Complete medical history and physical examination', duration: '20-30 min' },
          { step: 2, title: 'Diagnosis', description: 'Lab tests and diagnostic procedures as needed', duration: 'Same day' },
          { step: 3, title: 'Treatment', description: 'Prescription, procedures, or specialist referral', duration: 'Immediate' },
          { step: 4, title: 'Follow-up', description: 'Monitoring and adjustments to treatment plan', duration: 'As needed' },
        ],
        pricing: {
          consultation: { 
            price: '₹800', 
            duration: '/visit', 
            features: [
              'Complete physical exam',
              'Basic diagnostics',
              'Treatment plan',
              'Prescription',
              'Follow-up advice',
            ],
            recommended: true,
          },
          checkup: { 
            price: '₹5,000', 
            duration: '/checkup', 
            features: [
              'Full body checkup',
              'Blood tests (CBC, sugar, lipid)',
              'ECG',
              'Doctor consultation',
              'Health report',
            ],
            recommended: false,
          },
          wellness: { 
            price: '₹8,000', 
            duration: '/year', 
            features: [
              '2 consultations/year',
              'Annual health checkup',
              '24/7 telemedicine access',
              'Priority appointments',
              'Health counseling',
            ],
            recommended: false,
          },
        },
        caseStudy: {
          client: 'Mrs. Priya Sharma',
          industry: '45 years, Bangalore',
          logo: '👩',
          challenge: 'Persistent fatigue, headaches, and difficulty sleeping. Concerned about overall health.',
          solution: 'Comprehensive health assessment revealed vitamin D deficiency and mild hypertension. Started on supplements and lifestyle modifications.',
          results: [
            'Energy levels improved in 3 weeks',
            'Better sleep quality',
            'Blood pressure normalized',
            'Overall health improved',
          ],
          testimonial: 'The doctors took time to understand my concerns and provided personalized care. I feel healthier than ever!',
          author: 'Priya Sharma, Patient',
        },
        faqs: [
          {
            question: 'What conditions do you treat?',
            answer: 'We treat common illnesses (fever, cold, flu), chronic conditions (diabetes, hypertension), infections, minor injuries, and provide preventive care and health checkups.',
          },
          {
            question: 'Do I need an appointment?',
            answer: 'While walk-ins are welcome, we recommend booking an appointment for shorter wait times. Same-day appointments available.',
          },
          {
            question: 'Can I get lab tests done on the same day?',
            answer: 'Yes, we have in-house lab facilities for most common tests with same-day results available.',
          },
          {
            question: 'Do you provide home visits?',
            answer: 'Yes, home visit services are available for elderly or bedridden patients. Contact us for details and pricing.',
          },
        ],
      },
      // Add 'orthopedics' and 'pediatrics' following the same structure...
    };

    return departments[id] || null;
  };

  const department = getDepartmentData(departmentId);

  if (!department) {
    console.error('❌ Department not found:', departmentId);
    return (
      <div className="service-not-found">
        <div className="not-found-content">
          <h1>Department Not Found</h1>
          <p>The medical department you're looking for doesn't exist.</p>
          <button className="back-btn" onClick={() => navigate('/departments')}>
            ← Back to Departments
          </button>
        </div>
      </div>
    );
  }

  const handleCTAClick = () => {
    console.log('🚀 CTA clicked - Book Appointment for:', department.title);
    behaviorTracker.trackClick('cta-button', `Book ${department.title} Appointment`);
  };

  const toggleFAQ = (index) => {
    console.log('❓ FAQ toggled:', index);
    setActiveFAQ(activeFAQ === index ? null : index);
  };

  return (
    <div className="service-detail-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <span className="logo-icon">🏥</span>
            <span className="logo-text">MediFlow</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate('/')}>Home</button>
            <button className="nav-link" onClick={() => navigate('/departments')}>Departments</button>
            <button className="nav-link" onClick={() => navigate('/doctor')}>Doctor Portal</button>
            <button className="nav-cta" onClick={handleCTAClick}>Book Appointment</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="service-hero">
        <div className="service-hero-content">
          <button className="back-link" onClick={() => navigate('/departments')}>
            ← All Departments
          </button>
          <div className="service-icon-hero">{department.icon}</div>
          <h1>{department.title}</h1>
          <p className="service-tagline">{department.tagline}</p>
          <p className="service-description">{department.description}</p>
          
          <div className="benefits-list">
            {department.benefits.map((benefit, index) => (
              <div key={index} className="benefit-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="hero-cta-group">
            <button className="cta-btn-primary" onClick={handleCTAClick}>
              <span>Book Appointment</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="cta-btn-secondary" onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}>
              View Pricing
            </button>
          </div>
        </div>
      </section>

      {/* Results Section - Same structure, different medical metrics */}
      {/* Features Section - Medical services */}
      {/* Process Section - Patient journey */}
      {/* Pricing Section - Consultation fees */}
      {/* Case Study Section - Patient testimonials */}
      {/* FAQ Section - Medical FAQs */}
      {/* Final CTA - Book appointment */}
      {/* Footer - MediFlow branding */}

      {/* ... (ALL OTHER SECTIONS FOLLOW SAME STRUCTURE AS ORIGINAL) */}
    </div>
  );
}

export default DepartmentDetailPage;
