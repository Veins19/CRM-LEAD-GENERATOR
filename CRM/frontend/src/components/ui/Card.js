// frontend/src/components/ui/Card.js

import React from 'react';
import { motion } from 'framer-motion';

/**
 * A flexible Card component with consistent styling.
 * @param {ReactNode} children - Content inside the card
 * @param {string} className - Additional CSS classes
 * @param {boolean} hover - Whether to add a hover lift effect
 * @param {object} style - Inline styles
 */
const Card = ({ children, className = '', hover = false, style = {}, ...props }) => {
  const baseStyle = {
    backgroundColor: 'var(--bg-surface)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
  };

  const hoverProps = hover
    ? {
        whileHover: { y: -4, boxShadow: 'var(--shadow-lg)' },
        whileTap: { y: -1 },
      }
    : {};

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ ...baseStyle, ...style }}
      {...hoverProps}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
