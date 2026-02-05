// frontend/src/components/ui/Input.js

import React, { useState, useMemo } from 'react';

/**
 * Reusable Input Component for Forms
 * Supports text, password, number, textarea, and select types.
 */
const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  options = [], // For select type
  rows = 4,     // For textarea
  icon = null,  // Icon element
  className = '',
  disabled = false,
  description = '', // helper text under the field
  ...props
}) => {

  const [focused, setFocused] = useState(false);
  const errorId = useMemo(() => (error ? `${name || 'input'}-error` : undefined), [error, name]);

  const containerStyle = {
    marginBottom: '1rem',
    width: '100%',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  };

  const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  // Base field styles – lock to theme variables to avoid white-on-white
  const fieldBase = {
    width: '100%',
    padding: '0.75rem 1rem',
    paddingLeft: icon ? '2.5rem' : '1rem',
    fontSize: '1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-input)',
    color: 'var(--text-primary)',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    transition: 'all 0.18s ease-in-out',
    outline: 'none',
    // Visual focus ring without relying solely on global :focus
    boxShadow: focused
      ? '0 0 0 2px rgba(37, 99, 235, 0.20)'
      : 'none',
    borderColor: focused
      ? 'var(--primary)'
      : (error ? 'var(--danger)' : 'var(--border)'),
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  };

  const textareaStyle = {
    ...fieldBase,
    resize: 'vertical',
    minHeight: '100px',
  };

  const selectStyle = {
    ...fieldBase,
    cursor: disabled ? 'not-allowed' : 'pointer',
    appearance: 'none', // cleaner select
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage:
      // Chevron-down using inline SVG, inherits currentColor for theme
      `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '18px 18px',
  };

  const iconStyle = {
    position: 'absolute',
    left: '0.8rem',
    color: 'var(--text-muted)',
    fontSize: '1.2rem',
    pointerEvents: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const errorStyle = {
    color: 'var(--danger)',
    fontSize: '0.85rem',
    marginTop: '0.35rem',
    fontWeight: 500,
  };

  const descriptionStyle = {
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '0.35rem',
  };

  const commonA11y = {
    'aria-invalid': !!error,
    'aria-required': required || undefined,
    'aria-describedby': error ? errorId : undefined,
    disabled,
    required,
    name,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label style={labelStyle}>
          {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}

      <div style={inputWrapperStyle}>
        {icon && <span style={iconStyle}>{icon}</span>}

        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            style={textareaStyle}
            {...commonA11y}
            {...props}
          />
        ) : type === 'select' ? (
          <select
            value={value}
            onChange={onChange}
            style={selectStyle}
            {...commonA11y}
            {...props}
          >
            {/* Placeholder option (keeps text visible in both themes) */}
            <option value="">
              {placeholder || 'Select an option'}
            </option>
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            style={fieldBase}
            {...commonA11y}
            {...props}
          />
        )}
      </div>

      {error ? (
        <div id={errorId} style={errorStyle}>{error}</div>
      ) : (
        description ? <div style={descriptionStyle}>{description}</div> : null
      )}
    </div>
  );
};

export default Input;
