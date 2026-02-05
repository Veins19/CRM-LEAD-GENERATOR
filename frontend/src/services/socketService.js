import { io } from 'socket.io-client';


/**
 * MediFlow Socket Service
 * Manages Socket.io client connection and events for real-time patient consultations
 * 
 * Features:
 * - Real-time WebSocket connection to backend
 * - Automatic reconnection with exponential backoff
 * - Event-driven architecture for consultation flow
 * - Behavior tracking integration
 * - Error handling and logging
 * 
 * Events:
 * - chatStart: Start new patient consultation
 * - userMessage: Send patient message to AI triage system
 * - chatEnd: End consultation session
 * - behaviorUpdate: Send patient behavior tracking data
 */


// ✅ FIXED: Changed port from 5000 to 5050
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5050';


class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    console.log('🏥 MediFlow Socket Service initialized');
    console.log('🔌 Socket URL:', SOCKET_URL);
  }


  /**
   * Connect to Socket.io server
   */
  connect() {
    try {
      // ✅ FIX: Check actual socket.connected, not just our flag
      if (this.socket && this.socket.connected) {
        console.log('✅ Socket already connected:', this.socket.id);
        this.connected = true; // Sync flag
        return this.socket;
      }


      console.log('🔌 Connecting to Socket.io server:', SOCKET_URL);


      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
      });


      // Connection event handlers
      this.socket.on('connect', () => {
        console.log('✅ Socket connected successfully:', this.socket.id);
        this.connected = true;
      });


      this.socket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        this.connected = false;
        
        // Log specific disconnect reasons
        if (reason === 'io server disconnect') {
          console.log('⚠️ Server disconnected the socket - manual reconnection required');
        } else if (reason === 'transport close') {
          console.log('⚠️ Transport connection closed - automatic reconnection initiated');
        }
      });


      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        console.error('❌ Full error:', error);
        this.connected = false;
      });


      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempt(s)');
        this.connected = true;
      });


      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
      });


      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });


      this.socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        console.log('💡 Please refresh the page to reconnect');
      });


      return this.socket;
    } catch (error) {
      console.error('❌ Error connecting to socket:', error);
      throw error;
    }
  }


  /**
   * Disconnect from Socket.io server
   */
  disconnect() {
    try {
      if (this.socket) {
        console.log('🔌 Disconnecting socket...');
        this.socket.disconnect();
        this.socket = null;
        this.connected = false;
        console.log('✅ Socket disconnected successfully');
      } else {
        console.log('ℹ️ Socket already disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting socket:', error);
    }
  }


  /**
   * Start consultation session
   * ✅ FIXED: Check actual socket.connected instead of our flag
   */
  startConsultation(data = {}) {
    try {
      // ✅ FIX: Check actual socket.connected state
      if (!this.socket) {
        console.error('❌ Socket not initialized');
        throw new Error('Socket not initialized - cannot start consultation');
      }

      if (!this.socket.connected) {
        console.error('❌ Socket not connected yet');
        console.log('Socket state:', {
          exists: !!this.socket,
          connected: this.socket.connected,
          id: this.socket.id,
        });
        throw new Error('Socket not connected - cannot start consultation');
      }

      // ✅ Sync our flag with actual state
      this.connected = true;

      console.log('🩺 Starting consultation session');
      console.log('📋 Initial data:', data);
      
      // ✅ FIXED: Changed event name to match backend
      this.socket.emit('chatStart', {
        ip_address: null,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...data,
      });
      
      console.log('✅ Consultation start event emitted');
    } catch (error) {
      console.error('❌ Error starting consultation:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }


  /**
   * Send patient message to AI triage system
   * ✅ FIXED: Check actual socket.connected instead of our flag
   */
  sendMessage(sessionId, message, metadata = {}) {
    try {
      // ✅ FIX: Check actual socket.connected state
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected - cannot send message');
      }

      // Sync flag
      this.connected = true;

      console.log('💬 Sending patient message:', message.substring(0, 50) + '...');
      console.log('📋 Session ID:', sessionId);

      this.socket.emit('userMessage', {
        sessionId,
        message,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
      
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }


  /**
   * End consultation session
   * ✅ FIXED: Check actual socket.connected instead of our flag
   */
  endConsultation(sessionId, reason = 'user_ended') {
    try {
      // ✅ FIX: Check actual socket.connected state
      if (!this.socket || !this.socket.connected) {
        console.warn('⚠️ Socket not connected, cannot end consultation');
        return;
      }

      // Sync flag
      this.connected = true;

      console.log('🏁 Ending consultation session');
      console.log('📋 Session ID:', sessionId);
      console.log('📋 Reason:', reason);

      // ✅ FIXED: Changed event name to match backend
      this.socket.emit('chatEnd', {
        sessionId,
        reason,
        timestamp: new Date().toISOString(),
      });
      
      console.log('✅ Consultation end event emitted');
    } catch (error) {
      console.error('❌ Error ending consultation:', error);
      console.error('Error stack:', error.stack);
    }
  }


  /**
   * Send behavior tracking update
   * ✅ FIXED: Check actual socket.connected instead of our flag
   */
  sendBehaviorUpdate(event, data) {
    try {
      // ✅ FIX: Check actual socket.connected state
      if (!this.socket || !this.socket.connected) {
        console.warn('⚠️ Socket not connected, cannot send behavior update');
        return;
      }

      // Sync flag
      this.connected = true;

      console.log('📊 Sending behavior update:', event);

      this.socket.emit('behaviorUpdate', {
        event,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error sending behavior update:', error);
      console.error('Error stack:', error.stack);
    }
  }


  /**
   * Register event listener
   */
  on(event, callback) {
    try {
      if (!this.socket) {
        throw new Error('Socket not initialized - cannot register event listener');
      }

      console.log('🔔 Registering event listener:', event);
      this.socket.on(event, callback);
    } catch (error) {
      console.error('❌ Error registering event listener:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }


  /**
   * Remove event listener
   */
  off(event, callback) {
    try {
      if (!this.socket) {
        console.warn('⚠️ Socket not initialized - cannot remove event listener');
        return;
      }

      console.log('🔕 Removing event listener:', event);
      
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    } catch (error) {
      console.error('❌ Error removing event listener:', error);
      console.error('Error stack:', error.stack);
    }
  }


  /**
   * Emit custom event
   * ✅ FIXED: Check actual socket.connected instead of our flag
   */
  emit(event, data) {
    try {
      // ✅ FIX: Check actual socket.connected state
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected - cannot emit event');
      }

      // Sync flag
      this.connected = true;

      console.log('📤 Emitting event:', event);
      this.socket.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error emitting event:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }


  /**
   * Get socket instance
   */
  getSocket() {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized yet');
    }
    return this.socket;
  }


  /**
   * Check if connected
   * ✅ FIXED: Use actual socket.connected state
   */
  isConnected() {
    // ✅ FIX: Check actual socket.connected state (more reliable)
    const actuallyConnected = this.socket && this.socket.connected;
    
    // Sync our flag with actual state
    if (actuallyConnected && !this.connected) {
      console.log('✅ Socket was already connected, syncing flag...');
      this.connected = true;
    }
    
    if (!actuallyConnected) {
      console.log('ℹ️ Socket connection status: disconnected');
      this.connected = false;
    }
    
    return actuallyConnected;
  }


  /**
   * Get connection state for debugging
   */
  getConnectionState() {
    const state = {
      initialized: !!this.socket,
      connected: this.connected,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      url: SOCKET_URL,
    };
    console.log('🔍 Connection state:', state);
    return state;
  }
}


// Create singleton instance
const socketService = new SocketService();


export default socketService;
