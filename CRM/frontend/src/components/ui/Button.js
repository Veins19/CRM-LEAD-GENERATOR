// frontend/src/components/ui/Button.js

import React from 'react';
import { motion } from 'framer-motion';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

/**
 * Reusable Button Component
 * @param {string} variant - primary, secondary, danger, outline, ghost
 * @param {string} size - sm, md, lg
 * @param {boolean} loading - Show loading spinner
 * @param {boolean} disabled
 * @param {ReactNode} icon - Icon component to display
 */
const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  className = '',
  style = {},
  ...props
}) => {
  // Base styles – never rely on browser defaults
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.18s ease-in-out',
    border: '1px solid transparent',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };

  const sizes = {
    sm: { padding: '0.35rem 0.7rem', fontSize: '0.8rem', minHeight: '30px' },
    md: { padding: '0.5rem 1rem', fontSize: '0.9rem', minHeight: '36px' },
    lg: { padding: '0.7rem 1.4rem', fontSize: '1rem', minHeight: '42px' },
  };

  // All variant colors are based on CSS variables so they flip correctly with data-theme
  const variantMap = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'var(--text-on-primary)',
      borderColor: 'var(--primary)',
    },
    secondary: {
      backgroundColor: 'var(--secondary)',
      color: 'var(--text-on-primary)',
      borderColor: 'var(--secondary)',
    },
    danger: {
      backgroundColor: 'var(--danger)',
      color: 'var(--text-on-primary)',
      borderColor: 'var(--danger)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--primary)',
      borderColor: 'var(--primary)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
  };

  const variantStyles = variantMap[variant] || variantMap.primary;
  const sizeStyles = sizes[size] || sizes.md;

  const isDisabled = disabled || loading;

  const currentStyle = {
    ...baseStyles,
    ...sizeStyles,
    ...variantStyles,
    opacity: isDisabled ? 0.6 : 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    ...style,
  };

  // Framer hover/press only when interactive
  const hoverProps = !isDisabled
    ? {
        whileHover: { scale: 1.02, filter: 'brightness(1.05)' },
        whileTap: { scale: 0.97 },
      }
    : {};

  return (
    <motion.button
      type={type}
      onClick={!isDisabled ? onClick : undefined}
      style={currentStyle}
      className={className}
      disabled={isDisabled}
      {...hoverProps}
      {...props}
    >
      {loading ? (
        <motion.span
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          {/* Spinner uses same color as button text so it is always visible */}
          <AiOutlineLoading3Quarters style={{ color: currentStyle.color }} />
        </motion.span>
      ) : (
        icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
        )
      )}
      <span>{loading ? 'Loading...' : children}</span>
    </motion.button>
  );
};

export default Button;
