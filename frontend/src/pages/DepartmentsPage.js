import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import behaviorTracker from '../services/behaviorTracker';
import '../styles/departments.css';

/**
 * MediFlow Departments Page Component
 * Medical departments listing with filtering and enhanced UX
 * 
 * Features:
 * - Department grid with cards
 * - Category filtering
 * - Department stats and features
 * - Appointment booking CTA
 */
function DepartmentsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    console.log('🏥 Viewing departments page');
    behaviorTracker.trackPageView('Departments', 'listing');
    
    return () => {
      behaviorTracker.trackPageExit();
    };
  }, []);

  const categories = [
    { id: 'all', label: 'All Departments', icon: '🏥' },
    { id: 'specialty', label: 'Specialty Care', icon: '⚕️' },
    { id: 'primary', label: 'Primary Care', icon: '🩺' },
    { id: 'emergency', label: 'Emergency', icon: '🚑' },
  ];

  const departments = [
    {
      id: 'general-medicine',
      icon: '🩺',
      title: 'General Medicine',
      category: 'primary',
      shortDesc: 'Comprehensive primary care for common illnesses and chronic conditions',
      results: '24/7 availability',
      features: ['Acute Care', 'Chronic Disease Management', 'Preventive Health', 'Health Checkups'],
      color: '#667eea',
      badge: 'Most Visited',
    },
    {
      id: 'cardiology',
      icon: '❤️',
      title: 'Cardiology',
      category: 'specialty',
      shortDesc: 'Expert heart care with advanced diagnostics and treatment',
      results: '95% patient satisfaction',
      features: ['ECG & Stress Testing', 'Echocardiography', 'Hypertension Management', 'Heart Failure Care'],
      color: '#764ba2',
      badge: 'Expert Care',
    },
    {
      id: 'orthopedics',
      icon: '🦴',
      title: 'Orthopedics',
      category: 'specialty',
      shortDesc: 'Bone, joint, and muscle care for injuries and chronic conditions',
      results: 'Same-day appointments',
      features: ['Fracture Care', 'Joint Pain Treatment', 'Sports Injuries', 'Arthritis Management'],
      color: '#f093fb',
      badge: 'Trending',
    },
    {
      id: 'pediatrics',
      icon: '👶',
      title: 'Pediatrics',
      category: 'primary',
      shortDesc: 'Specialized care for infants, children, and adolescents',
      results: 'Child-friendly environment',
      features: ['Well-child Checkups', 'Vaccinations', 'Growth Monitoring', 'Illness Treatment'],
      color: '#4facfe',
    },
    {
      id: 'dermatology',
      icon: '💆',
      title: 'Dermatology',
      category: 'specialty',
      shortDesc: 'Skin, hair, and nail care with advanced treatments',
      results: '98% success rate',
      features: ['Skin Conditions', 'Acne Treatment', 'Hair Loss', 'Cosmetic Dermatology'],
      color: '#43e97b',
    },
    {
      id: 'emergency',
      icon: '🚑',
      title: 'Emergency Care',
      category: 'emergency',
      shortDesc: '24/7 emergency medical services for urgent conditions',
      results: 'Immediate care',
      features: ['Trauma Care', 'Cardiac Emergencies', 'Severe Injuries', 'Critical Care'],
      color: '#fa709a',
      badge: '24/7 Available',
    },
    {
      id: 'gynecology',
      icon: '🤰',
      title: 'Gynecology',
      category: 'specialty',
      shortDesc: 'Comprehensive women\'s health and reproductive care',
      results: 'Compassionate care',
      features: ['Prenatal Care', 'Women\'s Health', 'Family Planning', 'Menopause Management'],
      color: '#30cfd0',
    },
  ];

  const filteredDepartments = activeCategory === 'all'
    ? departments
    : departments.filter(d => d.category === activeCategory);

  const handleDepartmentClick = (departmentName) => {
    console.log('🏥 Department clicked:', departmentName);
    behaviorTracker.trackClick('department-card', departmentName);
  };

  const stats = [
    { value: '10,000+', label: 'Patients Served' },
    { value: '95%', label: 'Satisfaction Rate' },
    { value: '24/7', label: 'Emergency Care' },
    { value: '15+', label: 'Specialties' },
  ];

  return (
    <div className="services-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <span className="logo-icon">🏥</span>
            <span className="logo-text">MediFlow</span>
          </div>
          <div className="nav-links">
            <button className="nav-link" onClick={() => navigate('/')}>
              Home
            </button>
            <button className="nav-link active">
              Departments
            </button>
            <button className="nav-link" onClick={() => navigate('/doctor')}>
              Doctor Portal
            </button>
            <button className="nav-cta">
              Book Appointment
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="services-hero">
        <div className="services-hero-content">
          <div className="hero-badge">
            <span className="badge-icon">✨</span>
            <span>15+ Medical Specialties</span>
          </div>
          <h1>Expert Medical Care, All Under One Roof</h1>
          <p>
            Access comprehensive healthcare with <strong>expert specialists</strong>, <strong>24/7 emergency care</strong>, and <strong>same-day appointments</strong>. 
            Quality care you can trust, when you need it most.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          {stats.map((stat, index) => (
            <div key={index} className="stat-item">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Category Filter */}
      <section className="category-section">
        <div className="category-filter">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => {
                console.log('🔍 Category filter changed:', cat.label);
                setActiveCategory(cat.id);
              }}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Departments Grid */}
      <section className="services-grid-section">
        <div className="services-grid-modern">
          {filteredDepartments.map((dept, index) => (
            <Link
              key={dept.id}
              to={`/departments/${dept.id}`}
              className="service-card-link"
              onClick={() => handleDepartmentClick(dept.title)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="service-card-enhanced">
                {dept.badge && (
                  <div className="service-badge" style={{ background: dept.color }}>
                    {dept.badge}
                  </div>
                )}
                <div className="service-icon-wrapper">
                  <div className="service-icon-bg" style={{ background: `${dept.color}20` }}>
                    <span className="service-icon-large">{dept.icon}</span>
                  </div>
                </div>
                <h3 className="service-title-enhanced">{dept.title}</h3>
                <p className="service-desc-enhanced">{dept.shortDesc}</p>
                
                <div className="service-features">
                  {dept.features.slice(0, 3).map((feature, idx) => (
                    <div key={idx} className="feature-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dept.color} strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="service-results-enhanced" style={{ color: dept.color }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <span>{dept.results}</span>
                </div>

                <div className="service-cta-enhanced" style={{ color: dept.color }}>
                  <span>Learn More</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-choose">
        <div className="why-content">
          <h2 className="section-title">Why Choose MediFlow?</h2>
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon">⚡</div>
              <h3>Same-Day Appointments</h3>
              <p>Book and see a specialist the same day for urgent medical needs—no long waiting times.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🩺</div>
              <h3>Expert Specialists</h3>
              <p>Our doctors have 15+ years of experience and are board-certified in their specialties.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🤝</div>
              <h3>Patient-Centered Care</h3>
              <p>Compassionate, personalized care that puts your health and comfort first.</p>
            </div>
            <div className="why-card">
              <div className="why-icon">🚀</div>
              <h3>Advanced Technology</h3>
              <p>State-of-the-art diagnostic equipment and treatment methods for accurate diagnosis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="services-cta">
        <div className="cta-content">
          <h2>Ready to Experience Better Healthcare?</h2>
          <p>Chat with our AI assistant to describe your symptoms and get instant department recommendations.</p>
          <button className="cta-btn-primary" onClick={() => console.log('🚀 Book Appointment CTA clicked')}>
            <span>Book Appointment Now</span>
            <span className="cta-arrow">→</span>
          </button>
          <p className="cta-note">No registration required • Same-day appointments • HIPAA-compliant</p>
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
              <h4>Quick Links</h4>
              <button onClick={() => navigate('/')}>Home</button>
              <button onClick={() => navigate('/departments')}>Departments</button>
              <button onClick={() => navigate('/doctor')}>Doctor Portal</button>
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

export default DepartmentsPage;
