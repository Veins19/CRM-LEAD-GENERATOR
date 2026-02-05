import React, { useEffect, useRef, useState } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import QuickActions from './QuickActions';

/**
 * MediFlow ChatWindow Component
 * Medical consultation chat window with header, messages, quick actions, and input
 * 
 * Features:
 * - Real-time message display
 * - Auto-scroll to latest message
 * - Error handling with auto-hide
 * - Connection status indicator
 * - Typing indicator
 * - Quick actions for common symptoms/departments
 * - Restart conversation option
 */
function ChatWindow({
  messages,
  isTyping,
  isConnected,
  error,
  isConsultationComplete,
  showQuickActions,
  onSendMessage,
  onQuickAction,
  onClose,
  onRestart,
}) {
  const messagesEndRef = useRef(null);
  const [showError, setShowError] = useState(false);
  const errorTimeoutRef = useRef(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, showQuickActions]);

  /**
   * Handle error display with auto-hide after 5 seconds
   */
  useEffect(() => {
    if (error) {
      console.error('❌ Chat error displayed:', error);
      setShowError(true);
      
      // Clear existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      // Set new timeout to hide error after 5 seconds
      errorTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Error auto-hidden after 5 seconds');
        setShowError(false);
      }, 5000);
    }
    
    // Cleanup
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Manually dismiss error
   */
  const dismissError = () => {
    console.log('🔕 Error manually dismissed');
    setShowError(false);
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <div className="chat-avatar">
            {/* Medical cross icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
            </svg>
          </div>
          <div className="chat-header-info">
            <h3 className="chat-title">MediFlow Assistant</h3>
            <p className="chat-status">
              {isConnected ? (
                <>
                  <span className="status-dot online"></span>
                  Online
                </>
              ) : (
                <>
                  <span className="status-dot offline"></span>
                  Offline
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="chat-header-actions">
          {/* Restart button (shown after consultation complete) */}
          {isConsultationComplete && (
            <button
              className="chat-restart-btn"
              onClick={onRestart}
              title="Start new consultation"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
              </svg>
            </button>
          )}
          
          {/* Close button */}
          <button
            className="chat-close-btn"
            onClick={onClose}
            aria-label="Close chat"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Error Banner with Auto-Hide */}
      {showError && error && (
        <div className="chat-error">
          <div className="chat-error-content">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
          <button 
            className="chat-error-dismiss" 
            onClick={dismissError}
            aria-label="Dismiss error"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          // Empty state
          <div className="chat-empty-state">
            <div className="empty-state-icon">🏥</div>
            <p>Welcome to MediFlow! Describe your symptoms to begin.</p>
          </div>
        ) : (
          // Messages list
          <>
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
            
            {/* Quick Actions */}
            {showQuickActions && (
              <QuickActions
                onSelectService={onQuickAction}
                disabled={!isConnected || isTyping}
              />
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="chat-message assistant">
                <div className="message-avatar">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
                  </svg>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - ALWAYS SHOWN (no longer locked after consultation complete) */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={!isConnected}
        placeholder={
          isConsultationComplete 
            ? "Ask any follow-up questions..." 
            : "Describe your symptoms..."
        }
      />

      {/* Footer */}
      <div className="chat-footer">
        {isConsultationComplete && (
          <button className="restart-conversation-btn-small" onClick={onRestart}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
            </svg>
            <span>Start New Consultation</span>
          </button>
        )}
        <p>Powered by MediFlow</p>
      </div>
    </div>
  );
}

export default ChatWindow;
