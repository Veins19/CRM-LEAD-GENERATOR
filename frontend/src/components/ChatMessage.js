import React from 'react';

/**
 * MediFlow ChatMessage Component
 * Renders a single medical consultation chat message with role-based styling
 * 
 * Features:
 * - Role-based styling (user/assistant/system)
 * - Markdown support (**bold**, [links], bullet points)
 * - Timestamp formatting
 * - Medical-themed avatars
 */
function ChatMessage({ role, content, timestamp }) {
  /**
   * Format timestamp for display
   */
  const formatTime = (date) => {
    if (!date) return '';
    
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  };

  /**
   * Get avatar icon based on role
   */
  const getAvatarIcon = () => {
    switch (role) {
      case 'assistant':
        // Medical assistant icon (stethoscope/medical cross)
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
          </svg>
        );
      
      case 'user':
        // User/patient icon
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
          </svg>
        );
      
      case 'system':
        // System notification icon
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
          </svg>
        );
      
      default:
        console.warn('⚠️ Unknown message role:', role);
        return null;
    }
  };

  /**
   * Parse markdown and format text
   * Handles: **bold**, [links], bullet points, line breaks
   */
  const parseMarkdown = (text) => {
    if (!text) {
      console.warn('⚠️ Empty message content');
      return '';
    }
    
    // Split into lines
    const lines = text.split('\n');
    const elements = [];
    let listItems = [];
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.length === 0) {
        // Empty line - close any open list
        if (listItems.length > 0) {
          elements.push(
            <ul key={`list-${lineIndex}`}>
              {listItems}
            </ul>
          );
          listItems = [];
        }
        return;
      }
      
      // Bullet point list item
      if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
        const itemText = trimmedLine.substring(2);
        listItems.push(
          <li key={`li-${lineIndex}`} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(itemText) }} />
        );
        return;
      }
      
      // Regular line - close any open list first
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${lineIndex}`}>
            {listItems}
          </ul>
        );
        listItems = [];
      }
      
      // Add paragraph
      elements.push(
        <p key={`p-${lineIndex}`} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmedLine) }} />
      );
    });
    
    // Close any remaining list
    if (listItems.length > 0) {
      elements.push(
        <ul key="list-final">
          {listItems}
        </ul>
      );
    }
    
    return elements;
  };

  /**
   * Format inline markdown (bold, links)
   */
  const formatInlineMarkdown = (text) => {
    // Bold: **text** or __text__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Email links: mailto:
    text = text.replace(/mailto:([^\s]+)/g, '<a href="mailto:$1">$1</a>');
    
    return text;
  };

  return (
    <div className={`chat-message ${role}`}>
      {/* Avatar (for assistant and system only) */}
      {(role === 'assistant' || role === 'system') && (
        <div className="message-avatar">
          {getAvatarIcon()}
        </div>
      )}

      {/* Message Content */}
      <div className="message-content">
        <div className="message-bubble">
          {parseMarkdown(content)}
        </div>
        
        {/* Timestamp */}
        {timestamp && (
          <div className="message-timestamp">
            {formatTime(timestamp)}
          </div>
        )}
      </div>

      {/* Avatar (for user only, on right side) */}
      {role === 'user' && (
        <div className="message-avatar">
          {getAvatarIcon()}
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
