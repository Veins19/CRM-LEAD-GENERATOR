import React from 'react';

/**
 * MediFlow QuickActions Component
 * Displays clickable medical department/symptom buttons in the chat
 * 
 * Features:
 * - Common departments (Cardiology, Orthopedics, etc.)
 * - Common symptoms (Fever, Pain, etc.)
 * - Quick access to emergency triage
 * - Disabled state support
 */
function QuickActions({ onSelectService, disabled }) {
  const departments = [
    { id: 'general', label: '🩺 General Medicine', value: 'General Medicine' },
    { id: 'cardiology', label: '❤️ Cardiology', value: 'Cardiology' },
    { id: 'orthopedics', label: '🦴 Orthopedics', value: 'Orthopedics' },
    { id: 'pediatrics', label: '👶 Pediatrics', value: 'Pediatrics' },
    { id: 'fever', label: '🤒 Fever/Cold', value: 'fever or cold symptoms' },
    { id: 'pain', label: '😣 Pain/Injury', value: 'pain or injury' },
  ];

  const handleClick = (department) => {
    if (!disabled) {
      console.log('⚡ Quick action selected:', department.value);
      onSelectService(department.value);
    } else {
      console.warn('⚠️ Quick action disabled');
    }
  };

  return (
    <div className="quick-actions">
      <p className="quick-actions-title">Select a department or describe your symptoms:</p>
      <div className="quick-actions-grid">
        {departments.map((dept) => (
          <button
            key={dept.id}
            className="quick-action-btn"
            onClick={() => handleClick(dept)}
            disabled={disabled}
            aria-label={`Select ${dept.value}`}
          >
            {dept.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickActions;
