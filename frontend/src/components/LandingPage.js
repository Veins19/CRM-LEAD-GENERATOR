import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';

/**
 * MediFlow Landing Page Component
 * Medical clinic landing page with hero, departments, how it works, testimonials, CTA
 * 
 * Features:
 * - Hero section with chatbot CTA
 * - Medical departments showcase
 * - How consultation works
 * - Patient testimonials
 * - Footer with navigation
 */
function LandingPage({ onStartChat }) {
  const navigate = useNavigate();

  const departments = [
    {
      icon: '🩺',
      title: 'General Medicine',
      description: 'Comprehensive primary care for common illnesses and routine checkups',
      metric: '24/7 available',
    },
    {
      icon: '❤️',
      title: 'Cardiology',
      description: 'Expert heart care with advanced diagnostics and treatment',
      metric: 'Heart specialist',
    },
    {
      icon: '🦴',
      title: 'Orthopedics',
      description: 'Bone, joint, and muscle care for injuries and chronic conditions',
      metric: 'Same-day care',
    },
    {
      icon: '👶',
      title: 'Pediatrics',
      description: 'Specialized care for infants, children, and adolescents',
      metric: 'Child-friendly',
    },
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Describe Symptoms',
      description: 'Chat with our AI assistant to describe your health concerns and symptoms',
      icon: '💬',
    },
    {
      step: '2',
      title: 'Get Triage & Recommendations',
      description: 'Receive AI-powered triage assessment and department recommendations',
      icon: '🤖',
    },
    {
      step: '3',
      title: 'Book Appointment',
      description: 'Schedule a consultation with the right specialist at your convenience',
      icon: '📅',
    },
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      company: 'Bangalore',
      text: 'MediFlow\'s AI chatbot helped me understand my symptoms and book an appointment with the right doctor in minutes. The care I received was excellent!',
      metric: '5-min booking',
    },
    {
      name: 'Rajesh Kumar',
      company: 'Hyderabad',
      text: 'The triage system accurately identified my condition urgency. I was seen by a cardiologist the same day. Highly recommend!',
      metric: 'Same-day care',
    },
    {
      name: 'Anjali Patel',
      company: 'Mumbai',
      text: 'As a parent, the pediatrics department has been a lifesaver. The doctors are caring, and the AI chatbot makes booking so easy.',
      metric: 'Trusted care',
    },
  ];

  const handleStartChat = () => {
    console.log('🚀 User clicked "Start Consultation" button');
    onStartChat();
  };

  const handleNavigateDepartments = () => {
    console.log('📍 Navigating to departments page');
    navigate('/departments');
  };

  const handleNavigateDoctorDashboard = () => {
    console.log('👨‍⚕️ Navigating to doctor dashboard');
    navigate('/doctor');
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">🏥</span>
            <span className="logo-text">MediFlow</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={handleNavigateDepartments}>
              Departments
            </button>
            <button className="nav-link" onClick={handleNavigateDoctorDashboard}>
              Doctor Portal
            </button>
            <button className="nav-cta" onClick={handleStartChat}>
              Consult Now
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            <span>Trusted by 10,000+ patients across India</span>
          </div>
          <h1 className="hero-title">
            Your Health, Our Priority with
            <span className="gradient-text"> AI-Powered Care</span>
          </h1>
          <p className="hero-subtitle">
            Experience <strong>faster diagnosis</strong>, <strong>accurate triage</strong>, and <strong>personalized care</strong>.
            Chat with our AI assistant to get instant recommendations and book appointments—no waiting, no hassle.
          </p>
          <div className="hero-cta-group">
            <button className="hero-cta primary" onClick={handleStartChat}>
              <span>Start Free Consultation</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="hero-cta secondary" onClick={handleNavigateDepartments}>
              <span>Explore Departments</span>
            </button>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <span className="trust-icon">⭐</span>
              <span className="trust-text">4.8/5 patient rating</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">🔒</span>
              <span className="trust-text">HIPAA-compliant security</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">⚡</span>
              <span className="trust-text">Same-day appointments</span>
            </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="stats-showcase">
            <div className="stat-card">
              <div className="stat-value">95%</div>
              <div className="stat-label">Patient Satisfaction</div>
              <div className="stat-trend">↗ Verified reviews</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">5 min</div>
              <div className="stat-label">Avg. Booking Time</div>
              <div className="stat-trend">↗ AI-powered triage</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">24/7</div>
              <div className="stat-label">AI Assistant</div>
              <div className="stat-trend">↗ Always available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section className="services-section">
        <div className="section-header">
          <h2 className="section-title">Our Medical Departments</h2>
          <p className="section-subtitle">
            Comprehensive healthcare services with expert specialists
          </p>
        </div>
        <div className="services-grid">
          {departments.map((dept, index) => (
            <div key={index} className="service-card-modern">
              <div className="service-icon-large">{dept.icon}</div>
              <div className="service-metric">{dept.metric}</div>
              <h3 className="service-title-modern">{dept.title}</h3>
              <p className="service-description-modern">{dept.description}</p>
              <button className="service-learn-more" onClick={handleNavigateDepartments}>
                Learn more →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Get expert medical care in 3 simple steps—no waiting rooms
          </p>
        </div>
        <div className="steps-container">
          {howItWorks.map((item, index) => (
            <div key={index} className="step-card">
              <div className="step-number">{item.step}</div>
              <div className="step-icon">{item.icon}</div>
              <h3 className="step-title">{item.title}</h3>
              <p className="step-description">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="section-header">
          <h2 className="section-title">Trusted by Patients Nationwide</h2>
          <p className="section-subtitle">
            See what our patients say about their experience
          </p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-stars">⭐⭐⭐⭐⭐</div>
              <p className="testimonial-text">"{testimonial.text}"</p>
              <div className="testimonial-metric">{testimonial.metric}</div>
              <div className="testimonial-author">
                <div className="author-name">{testimonial.name}</div>
                <div className="author-company">{testimonial.company}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Experience Better Healthcare?</h2>
          <p className="cta-subtitle">
            Join 10,000+ patients receiving AI-powered, personalized medical care
          </p>
          <button className="cta-button-large" onClick={handleStartChat}>
            <span>Start Free Consultation</span>
            <span className="cta-arrow">→</span>
          </button>
          <p className="cta-disclaimer">No registration required • Same-day appointments • HIPAA-compliant</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-modern">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="logo-icon">🏥</span>
              <span className="logo-text">MediFlow</span>
            </div>
            <p className="footer-tagline">
              AI-powered healthcare for modern India
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Departments</h4>
              <button onClick={handleNavigateDepartments}>General Medicine</button>
              <button onClick={handleNavigateDepartments}>Cardiology</button>
              <button onClick={handleNavigateDepartments}>Orthopedics</button>
              <button onClick={handleNavigateDepartments}>Pediatrics</button>
            </div>
            <div className="footer-column">
              <h4>Quick Links</h4>
              <button onClick={handleNavigateDoctorDashboard}>Doctor Portal</button>
              <button onClick={handleStartChat}>Consult Now</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 MediFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
