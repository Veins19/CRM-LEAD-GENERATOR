import logger from '../utils/logger.js';


/**
 * Behavior Controller
 * Handles real-time behavioral tracking events from frontend
 */


// Store active behavior sessions
const activeSessions = new Map();


/**
 * Handle behavior update event
 */
const handleBehaviorUpdate = (socket, data) => {
  try {
    const { event, data: eventData, session, timestamp } = data;


    // Get or create session tracking
    let sessionData = activeSessions.get(session.sessionId);
    if (!sessionData) {
      sessionData = {
        socketId: socket.id,
        startTime: Date.now(),
        events: [],
      };
      activeSessions.set(session.sessionId, sessionData);
    }


    // Add event
    sessionData.events.push({
      event,
      data: eventData,
      timestamp,
    });


    // Log based on event type
    switch (event) {
      case 'session_started':
        logger.section('BEHAVIOR TRACKING SESSION');
        logger.info(`🆕 New Session: ${session.sessionId}`);
        break;


      case 'page_view':
        const pageIcon = eventData.isServicePage ? '🎯' : '📄';
        logger.info(`${pageIcon} Page View: ${eventData.page} (${eventData.type})`);
        logger.debug(`   └─ Pages Visited: ${session.pagesVisited || 0}`);
        logger.debug(`   └─ Behavior Score: ${session.behaviorScore || 0}/100 (${session.engagementLevel || 'none'})`);
        break;


      case 'page_exit':
        logger.info(`👋 Page Exit: ${eventData.page}`);
        logger.debug(`   └─ Time on Page: ${eventData.timeSpent || 0}s`);
        logger.debug(`   └─ Scroll Depth: ${eventData.scrollDepth || 0}%`);
        break;


      case 'scroll':
        if (eventData.depth >= 75) {
          logger.info(`📜 Deep Scroll: ${eventData.depth}% on ${eventData.page} 🔥`);
        }
        break;


      case 'click':
        logger.info(`🖱️  Click: ${eventData.label} on ${eventData.page}`);
        break;


      case 'heartbeat':
        logger.debug(`💓 Session Active: ${eventData.currentPage} (${eventData.timeOnPage}s)`);
        logger.debug(`   └─ Total Pages: ${session.pagesVisited || 0}`);
        
        // ✅ FIX: Check if servicesViewed exists and is an array before calling .join()
        const servicesViewed = Array.isArray(session.servicesViewed) 
          ? session.servicesViewed.join(', ') 
          : 'None';
        logger.debug(`   └─ Services Viewed: ${servicesViewed}`);
        logger.debug(`   └─ Score: ${session.behaviorScore || 0}/100 (${session.engagementLevel || 'none'})`);
        break;


      case 'session_ended':
        logger.section('BEHAVIOR SESSION ENDED');
        logger.success(`✅ Session Completed: ${session.sessionId}`);
        logger.info(`   📊 Final Stats:`);
        logger.info(`      ├─ Pages Visited: ${eventData.totalPages || 0}`);
        logger.info(`      ├─ Time on Site: ${eventData.totalTimeSpent || 0}s`);
        
        // ✅ FIX: Check if servicesViewed exists and is an array before calling .join()
        const finalServicesViewed = Array.isArray(session.servicesViewed) 
          ? session.servicesViewed.join(', ') 
          : 'None';
        logger.info(`      ├─ Services Viewed: ${finalServicesViewed}`);
        logger.info(`      └─ Behavior Score: ${eventData.finalScore || 0}/100 (${session.engagementLevel || 'none'})`);
        logger.separator();
        
        // Clean up session
        activeSessions.delete(session.sessionId);
        break;
    }


    // Show high-value lead alerts
    if ((session.behaviorScore || 0) >= 70 && event === 'page_view') {
      logger.success(`🔥 HIGH-VALUE LEAD DETECTED!`);
      logger.info(`   └─ Score: ${session.behaviorScore}/100`);
      
      // ✅ FIX: Check if servicesViewed exists and is an array before calling .join()
      const highValueServices = Array.isArray(session.servicesViewed) 
        ? session.servicesViewed.join(', ') 
        : 'None';
      logger.info(`   └─ Services: ${highValueServices}`);
    }


  } catch (error) {
    logger.error('Error handling behavior update:', error.message);
    logger.error('Stack trace:', error.stack);
  }
};


/**
 * Setup behavior tracking handlers
 */
const setupBehaviorHandlers = (io) => {
  try {
    io.on('connection', (socket) => {
      // Listen for behavior updates
      socket.on('behaviorUpdate', (data) => handleBehaviorUpdate(socket, data));


      // Clean up on disconnect
      socket.on('disconnect', () => {
        // Find and remove session for this socket
        for (const [sessionId, sessionData] of activeSessions.entries()) {
          if (sessionData.socketId === socket.id) {
            logger.debug(`🔌 Behavior session disconnected: ${sessionId}`);
            activeSessions.delete(sessionId);
          }
        }
      });
    });


    logger.success('Behavior tracking handlers set up successfully');
  } catch (error) {
    logger.error('Error setting up behavior tracking handlers:', error.message);
    logger.error('Stack trace:', error.stack);
  }
};


export default {
  setupBehaviorHandlers,
};
