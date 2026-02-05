// frontend/src/components/ui/Modal.js

import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineClose } from 'react-icons/ai';

/**
 * Reusable Modal Component
 * @param {boolean} isOpen - Control visibility
 * @param {function} onClose - Function to close modal
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {string} size - sm, md, lg, xl
 */
const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const contentRef = useRef(null);
  const triggerRef = useRef(null); // Element that had focus before opening

  // Title id for aria-labelledby
  const titleId = useMemo(
    () => `modal-title-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent scrolling when modal is open and manage focus trap/restore
  useEffect(() => {
    if (isOpen) {
      // Save the element that triggered the modal (focused element)
      triggerRef.current = document.activeElement;

      // Lock scroll
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus first focusable within the modal
      const firstFocusable = getFocusable(contentRef.current)[0];
      if (firstFocusable) firstFocusable.focus();
      else if (contentRef.current) contentRef.current.focus();

      // Keydown handler to trap focus inside modal
      const trap = (e) => {
        if (e.key !== 'Tab') return;
        const focusables = getFocusable(contentRef.current);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      contentRef.current?.addEventListener('keydown', trap);

      return () => {
        // Restore scroll
        document.body.style.overflow = prevOverflow;
        // Remove trap
        contentRef.current?.removeEventListener('keydown', trap);
        // Restore focus to the invoker
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  const maxWidths = {
    sm: '400px',
    md: '600px',
    lg: '800px',
    xl: '1100px',
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              // Dark, semi-opaque backdrop that works for both themes
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          />

          {/* Modal Content */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            ref={contentRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              margin: 'auto',
              width: '100%',
              maxWidth: maxWidths[size],
              height: 'fit-content',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
            onClick={(e) => e.stopPropagation()} // Prevent backdrop close when clicking inside
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                id={title ? titleId : undefined}
                style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '1.5rem',
                  display: 'flex',
                  padding: '6px',
                  borderRadius: '8px',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-body)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                aria-label="Close dialog"
              >
                <AiOutlineClose />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                padding: '1.5rem',
                overflowY: 'auto',
                color: 'var(--text-primary)',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Returns a list of focusable elements inside a container
function getFocusable(container) {
  if (!container) return [];
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  const nodes = Array.from(container.querySelectorAll(focusableSelectors.join(',')));
  return nodes.filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
}

export default Modal;
