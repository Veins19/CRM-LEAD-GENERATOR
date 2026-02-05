import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';
import behaviorTracker from '../services/behaviorTracker';
import ChatWindow from './ChatWindow';
import '../styles/chatbot.css';

/**
 * MediFlow Chatbot Component
 * Medical consultation chatbot with Socket.io real-time communication
 * 
 * Features:
 * - Symptom collection and analysis
 * - AI-powered triage (urgent/routine/emergency)
 * - Appointment booking
 * - Live behavioral tracking for personalized responses
 * - Patient data collection
 */
function Chatbot({ forceOpen = false }) {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [isConsultationComplete, setIsConsultationComplete] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Refs
  const hasInitialized = useRef(false);
  const listenersRegistered = useRef(false);  // ✅ NEW: Track if listeners are registered

  /**
   * Handle forceOpen from landing page
   */
  useEffect(() => {
    if (forceOpen && !isOpen) {
      toggleChat();
    }
  }, [forceOpen]);

  /**
   * Initialize socket connection on component mount
   * ✅ FIXED: Don't remove listeners in cleanup (prevents React strict mode bug)
   */
  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      console.log('🏥 Initializing MediFlow chatbot...');

      // Connect to Socket.io server
      const socket = socketService.connect();
      if (socket) {
        console.log('✅ Socket connection initiated');
      }

      // Setup event listeners (only once!)
      setupSocketListeners();

      // ✅ FIXED: Don't cleanup listeners on unmount (prevents double-listener bug)
      return () => {
        console.log('🧹 Cleaning up chatbot (keeping listeners alive)...');
        if (sessionId) {
          socketService.endConsultation(sessionId);
        }
        // ✅ DON'T remove listeners! They should persist!
      };
    } catch (error) {
      console.error('❌ Error initializing chatbot:', error);
      setError('Failed to connect to medical consultation server');
    }
  }, []);

  /**
   * Setup Socket.io event listeners
   * ✅ FIXED: Check if listeners are already registered before adding new ones
   */
  const setupSocketListeners = () => {
    // ✅ FIXED: Check if already registered
    if (listenersRegistered.current) {
      console.log('ℹ️ Listeners already registered, skipping...');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      console.warn('⚠️ Socket not initialized yet, cannot setup listeners');
      return;
    }
    
    console.log('🔔 Registering socket event listeners...');

    // Connection established
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    // Chat session started
    socketService.on('chatStarted', (data) => {
      console.log('💬 Chat session started:', data);
      setSessionId(data.sessionId);
      
      // Use the welcome message from backend (already has context)
      addMessage('assistant', data.message);
      setIsTyping(false);
      
      // Show quick actions after welcome message
      setTimeout(() => {
        setShowQuickActions(true);
      }, 500);
    });

    // Bot message received
    socketService.on('botMessage', (data) => {
      console.log('🤖 Bot message received:', data);
      addMessage('assistant', data.message);
      setIsTyping(false);

      // Check if consultation is complete
      if (data.isPatientComplete) {
        console.log('✅ Patient consultation complete');
        setIsConsultationComplete(true);
        setShowQuickActions(false);
      }
    });

    // Consultation processed successfully
    socketService.on('patientProcessed', (data) => {
      console.log('📋 Consultation processed:', data);
      addMessage('system', data.message);
      setIsConsultationComplete(true);
      setShowQuickActions(false);
    });

    // Chat ended
    socketService.on('chatEnded', (data) => {
      console.log('👋 Chat ended:', data);
    });

    // Error occurred
    socketService.on('error', (data) => {
      console.error('❌ Chat error:', data);
      setError(data.message || 'An error occurred during consultation');
      setIsTyping(false);
    });

    // Socket disconnected
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
      setError('Connection lost. Please refresh the page.');
    });

    // Socket reconnected
    socket.on('reconnect', () => {
      console.log('🔄 Socket reconnected');
      setIsConnected(true);
      setError(null);
    });

    // ✅ Mark as registered
    listenersRegistered.current = true;
    console.log('✅ All socket listeners registered successfully');
  };

  /**
   * Add message to chat
   */
  const addMessage = (role, content) => {
    const newMessage = {
      role,
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  /**
   * Toggle chat window
   */
  const toggleChat = () => {
    if (!isOpen && !sessionId) {
      // Opening for first time - start chat session with behavior data
      startChat();
    }
    setIsOpen(!isOpen);
  };

  /**
   * Start chat session with LIVE behavioral context
   */
  const startChat = () => {
    try {
      console.log('🚀 Starting new medical consultation...');
      console.log('🔍 Socket status:', socketService.getConnectionState());
      
      setIsTyping(true);
      
      // Get LIVE behavior data from tracker
      const liveBehaviorData = behaviorTracker.getIntentSummary();
      
      console.log('📊 Sending live behavior data:', liveBehaviorData);
      
      // Send behavior data to backend
      const startData = {
        behaviorData: liveBehaviorData,
      };
      
      // Call startConsultation (will auto-connect if needed)
      socketService.startConsultation(startData);
      console.log('✅ Chat start request sent');
    } catch (error) {
      console.error('❌ Error starting chat:', error);
      console.error('Error stack:', error.stack);
      setError('Failed to start medical consultation');
      setIsTyping(false);
    }
  };

  /**
   * Send message to server
   */
  const sendMessage = (message) => {
    try {
      if (!message || message.trim().length === 0) {
        console.warn('⚠️ Empty message not sent');
        return;
      }

      if (!sessionId) {
        console.error('❌ Chat session not started');
        setError('Chat session not started');
        return;
      }

      if (!socketService.isConnected()) {
        console.error('❌ Not connected to server');
        setError('Not connected to server');
        return;
      }

      // Hide quick actions after first message
      setShowQuickActions(false);

      // Add user message to chat
      addMessage('user', message);

      // Show typing indicator
      setIsTyping(true);

      console.log('📤 Sending message:', message);

      // Send to server
      socketService.sendMessage(sessionId, message);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Error stack:', error.stack);
      setError('Failed to send message');
      setIsTyping(false);
    }
  };

  /**
   * Handle quick action selection (symptoms/departments)
   */
  const handleQuickAction = (department) => {
    console.log('⚡ Quick action selected:', department);
    sendMessage(`I need help with ${department}`);
  };

  /**
   * Close chat and end session
   */
  const closeChat = () => {
    try {
      if (sessionId) {
        console.log('🔚 Ending chat session:', sessionId);
        socketService.endConsultation(sessionId);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('❌ Error closing chat:', error);
      console.error('Error stack:', error.stack);
    }
  };

  /**
   * Restart chat (new session)
   */
  const restartChat = () => {
    try {
      console.log('🔄 Restarting chat session...');
      
      // End current session
      if (sessionId) {
        socketService.endConsultation(sessionId);
      }

      // Reset state
      setSessionId(null);
      setMessages([]);
      setIsTyping(false);
      setError(null);
      setIsConsultationComplete(false);
      setShowQuickActions(false);

      // Start new session with fresh behavior data
      startChat();
    } catch (error) {
      console.error('❌ Error restarting chat:', error);
      console.error('Error stack:', error.stack);
      setError('Failed to restart consultation');
    }
  };

  return (
    <div className="chatbot-container">
      {/* Chat Window */}
      {isOpen && (
        <ChatWindow
          messages={messages}
          isTyping={isTyping}
          isConnected={isConnected}
          error={error}
          isConsultationComplete={isConsultationComplete}
          showQuickActions={showQuickActions}
          onSendMessage={sendMessage}
          onQuickAction={handleQuickAction}
          onClose={closeChat}
          onRestart={restartChat}
        />
      )}

      {/* Toggle Button */}
      <button
        className={`chatbot-toggle ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label="Toggle medical consultation chat"
      >
        {isOpen ? (
          // Close icon
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          // Medical chat icon
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
        
        {/* Notification badge */}
        {!isConnected && !isOpen && (
          <span className="notification-badge">!</span>
        )}
      </button>
    </div>
  );
}

export default Chatbot;
