import React, { useState, useRef, useEffect } from 'react';

/**
 * MediFlow ChatInput Component
 * Medical consultation message input field with send button
 * 
 * Features:
 * - Auto-focus on mount
 * - Enter to send (Shift+Enter for line breaks)
 * - Character limit (1000 chars)
 * - Input validation
 * - Disabled state during processing
 */
function ChatInput({ onSendMessage, disabled, placeholder }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  /**
   * Focus input on mount
   */
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
      console.log('✅ Chat input focused');
    }
  }, [disabled]);

  /**
   * Handle input change
   */
  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  /**
   * Handle form submit
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  /**
   * Send message
   */
  const sendMessage = () => {
    // Trim message
    const trimmedMessage = message.trim();

    // Validate
    if (!trimmedMessage || trimmedMessage.length === 0) {
      console.warn('⚠️ Empty message not sent');
      return;
    }

    if (disabled) {
      console.warn('⚠️ Input disabled, message not sent');
      return;
    }

    console.log('📤 Sending message:', trimmedMessage);

    // Send message
    onSendMessage(trimmedMessage);

    // Clear input
    setMessage('');

    // Refocus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('⌨️ Enter pressed - sending message');
      sendMessage();
    }
    
    // Allow Shift+Enter for line breaks
    // (handled automatically by textarea)
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <div className="input-container">
        {/* Text Input */}
        <textarea
          ref={inputRef}
          className="input-field"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Describe your symptoms...'}
          disabled={disabled}
          rows={1}
          maxLength={1000}
          aria-label="Medical consultation message input"
        />

        {/* Send Button */}
        <button
          type="submit"
          className="send-button"
          disabled={disabled || !message.trim()}
          aria-label="Send message"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

      {/* Character counter (optional, shown when close to limit) */}
      {message.length > 800 && (
        <div className="char-counter">
          {message.length}/1000
        </div>
      )}
    </form>
  );
}

export default ChatInput;
