/**
 * MediFlow Behavior Tracker Service
 * Tracks patient interactions across the website for urgency assessment
 * 
 * Features:
 * - Unique sessions per patient
 * - Department viewing tracking
 * - Symptom research intent scoring
 * - Real-time behavior updates via Socket.io
 * - Medical urgency assessment
 */

class BehaviorTracker {
  constructor() {
    this.sessionKey = 'mediflow_session';
    this.session = this.loadSession();
    this.socket = null;
    this.socketReady = false;
    this.pendingUpdates = [];
    
    // Department ID to Name mapping
    this.departmentNameMap = {
      'general-medicine': 'General Medicine',
      'cardiology': 'Cardiology',
      'orthopedics': 'Orthopedics',
      'pediatrics': 'Pediatrics',
      'dermatology': 'Dermatology',
      'emergency': 'Emergency Care',
      'gynecology': 'Gynecology',
    };
    
    this.startTracking();
    this.setupSocketConnection();
  }

  /**
   * Map department ID to proper name
   */
  getDepartmentName(departmentId) {
    return this.departmentNameMap[departmentId] || departmentId;
  }

  /**
   * Setup Socket.io connection for real-time logging
   */
  setupSocketConnection() {
    // Wait for socket service to be available
    const setupSocket = () => {
      try {
        console.log('🔌 Setting up behavior tracker socket connection...');
        // Import socketService dynamically
        import('./socketService').then((module) => {
          const socketService = module.default;
          this.socket = socketService.getSocket();
          
          if (this.socket && this.socket.connected) {
            console.log('✅ Behavior tracker connected to backend');
            this.socketReady = true;
            
            // Send session start
            this.sendBehaviorUpdate('session_started', {
              sessionId: this.session.sessionId,
              timestamp: new Date().toISOString(),
            });
            
            // Send any pending updates
            this.flushPendingUpdates();
          } else if (this.socket) {
            // Socket exists but not connected yet, wait for connection
            this.socket.on('connect', () => {
              console.log('✅ Behavior tracker connected to backend');
              this.socketReady = true;
              this.sendBehaviorUpdate('session_started', {
                sessionId: this.session.sessionId,
                timestamp: new Date().toISOString(),
              });
              this.flushPendingUpdates();
            });
          } else {
            // Socket not ready, retry
            console.log('⏳ Socket not ready, retrying...');
            setTimeout(setupSocket, 500);
          }
        }).catch(() => {
          console.log('⏳ Waiting for socket service...');
          setTimeout(setupSocket, 500);
        });
      } catch (error) {
        console.log('⏳ Waiting for socket service...');
        setTimeout(setupSocket, 500);
      }
    };
    
    setupSocket();
  }

  /**
   * Flush pending updates when socket connects
   */
  flushPendingUpdates() {
    console.log('📤 Flushing pending behavior updates:', this.pendingUpdates.length);
    while (this.pendingUpdates.length > 0) {
      const update = this.pendingUpdates.shift();
      this.sendBehaviorUpdate(update.event, update.data);
    }
  }

  /**
   * Send behavior update to backend
   */
  sendBehaviorUpdate(event, data) {
    const update = {
      event,
      data,
      session: {
        sessionId: this.session.sessionId,
        pagesVisited: this.session.pages.length,
        departmentsViewed: Object.keys(this.session.departmentInterest).map(id => this.getDepartmentName(id)),
        totalTimeSpent: this.session.totalTimeSpent,
        behaviorScore: this.calculateBehaviorScore(),
        engagementLevel: this.getEngagementLevel(),
      },
      timestamp: new Date().toISOString(),
    };

    if (this.socket && this.socket.connected && this.socketReady) {
      console.log('📡 Sending behavior update:', event);
      this.socket.emit('behaviorUpdate', update);
    } else {
      // Queue update for later
      console.log('📋 Queuing behavior update:', event);
      this.pendingUpdates.push({ event, data });
    }
  }

  /**
   * Load or create session with expiry check
   */
  loadSession() {
    const stored = localStorage.getItem(this.sessionKey);
    
    if (stored) {
      const session = JSON.parse(stored);
      const now = Date.now();
      const sessionAge = now - session.startTime;
      
      // Session expires after 30 minutes of inactivity
      const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
      
      if (sessionAge < SESSION_TIMEOUT) {
        console.log('📊 Resuming existing session:', session.sessionId);
        return session;
      } else {
        console.log('⏰ Session expired, creating new session');
        localStorage.removeItem(this.sessionKey);
      }
    }

    // Create new session
    const newSession = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pages: [],
      totalTimeSpent: 0,
      scrollDepth: {},
      clicks: [],
      departmentInterest: {},
    };

    this.saveSession(newSession);
    console.log('🆕 New session created:', newSession.sessionId);
    return newSession;
  }

  /**
   * Save session to localStorage
   */
  saveSession(session = this.session) {
    session.lastActivity = Date.now();
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Generate unique session ID with timestamp and random string
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 12);
    const userAgent = navigator.userAgent.slice(0, 10);
    const hash = btoa(`${timestamp}${random}${userAgent}`).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
    return `${timestamp}-${hash}`;
  }

  /**
   * Track page view
   */
  trackPageView(pageName, pageType = 'general') {
    // Convert department ID to proper name
    const displayName = pageType === 'department' ? this.getDepartmentName(pageName) : pageName;
    
    const pageData = {
      page: displayName,
      pageId: pageName, // Store original ID for tracking
      type: pageType,
      entryTime: Date.now(),
      exitTime: null,
      timeSpent: 0,
      scrollDepth: 0,
      interactions: 0,
    };

    this.session.pages.push(pageData);
    this.currentPage = pageData;
    
    // Track department interest (use original ID as key)
    if (pageType === 'department') {
      if (!this.session.departmentInterest[pageName]) {
        this.session.departmentInterest[pageName] = 0;
      }
      this.session.departmentInterest[pageName]++;
    }

    this.saveSession();
    
    // Send to backend
    this.sendBehaviorUpdate('page_view', {
      page: displayName,
      type: pageType,
      isDepartmentPage: pageType === 'department',
    });

    console.log(`📄 Page View: ${displayName} (${pageType})`);
  }

  /**
   * Track page exit
   */
  trackPageExit() {
    if (this.currentPage) {
      this.currentPage.exitTime = Date.now();
      this.currentPage.timeSpent = this.currentPage.exitTime - this.currentPage.entryTime;
      this.session.totalTimeSpent += this.currentPage.timeSpent;
      this.saveSession();
      
      // Send to backend
      this.sendBehaviorUpdate('page_exit', {
        page: this.currentPage.page,
        timeSpent: Math.round(this.currentPage.timeSpent / 1000), // seconds
        scrollDepth: this.currentPage.scrollDepth,
      });
      
      console.log(`📴 Page Exit: ${this.currentPage.page} - ${Math.round(this.currentPage.timeSpent / 1000)}s`);
    }
  }

  /**
   * Track scroll depth
   */
  trackScrollDepth() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    const scrollPercentage = Math.round(
      ((scrollTop + windowHeight) / documentHeight) * 100
    );

    if (this.currentPage) {
      const oldDepth = this.currentPage.scrollDepth;
      this.currentPage.scrollDepth = Math.max(
        this.currentPage.scrollDepth,
        scrollPercentage
      );
      
      // Only send updates for significant scroll changes (every 25%)
      if (Math.floor(scrollPercentage / 25) > Math.floor(oldDepth / 25)) {
        this.sendBehaviorUpdate('scroll', {
          page: this.currentPage.page,
          depth: scrollPercentage,
        });
        console.log(`📜 Scroll Depth: ${scrollPercentage}% on ${this.currentPage.page}`);
      }
      
      this.saveSession();
    }
  }

  /**
   * Track click event
   */
  trackClick(element, label) {
    this.session.clicks.push({
      element,
      label,
      timestamp: Date.now(),
    });

    if (this.currentPage) {
      this.currentPage.interactions++;
    }

    this.saveSession();
    
    // Send to backend
    this.sendBehaviorUpdate('click', {
      element,
      label,
      page: this.currentPage?.page,
    });

    console.log(`🖱️ Click: ${label} (${element})`);
  }

  /**
   * Start tracking
   */
  startTracking() {
    console.log('🚀 Starting behavior tracking...');
    
    // Track scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScrollDepth();
      }, 100);
    });

    // Track page exit
    window.addEventListener('beforeunload', () => {
      this.trackPageExit();
      this.sendBehaviorUpdate('session_ended', {
        totalPages: this.session.pages.length,
        totalTimeSpent: Math.round(this.session.totalTimeSpent / 1000),
        finalScore: this.calculateBehaviorScore(),
      });
    });

    // Track visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackPageExit();
      }
    });

    // Send periodic updates (every 30 seconds)
    setInterval(() => {
      if (this.socketReady && this.currentPage) {
        this.sendBehaviorUpdate('heartbeat', {
          currentPage: this.currentPage.page,
          timeOnPage: Math.round((Date.now() - this.currentPage.entryTime) / 1000),
        });
      }
    }, 30000);
  }

  /**
   * Get session data
   */
  getSession() {
    return this.session;
  }

  /**
   * Calculate behavioral score using medical urgency + engagement model
   * Adapted from healthcare patient engagement best practices
   */
  calculateBehaviorScore() {
    let baseScore = 0;
    
    // ========== MEDICAL INTENT SIGNALS (0-60 points) ==========
    
    // 1. Department Research Depth (0-25 points)
    const departmentPages = Object.keys(this.session.departmentInterest).length;
    const departmentRevisits = Object.values(this.session.departmentInterest).reduce((a, b) => a + b, 0);
    
    if (departmentPages >= 3) {
      baseScore += 25; // High concern: researching multiple specialties
    } else if (departmentPages === 2) {
      baseScore += 18; // Medium-high: comparing departments
    } else if (departmentPages === 1) {
      baseScore += 10; // Medium: specific concern
    }
    
    // Bonus for revisiting same department (shows urgency/concern)
    if (departmentRevisits > departmentPages) {
      baseScore += Math.min((departmentRevisits - departmentPages) * 3, 10);
    }
    
    // 2. Time Investment (0-20 points) - Signals serious health concern
    const minutesSpent = this.session.totalTimeSpent / 60000;
    if (minutesSpent >= 10) baseScore += 20;      // 10+ min = very concerned
    else if (minutesSpent >= 5) baseScore += 15;   // 5-10 min = concerned
    else if (minutesSpent >= 3) baseScore += 10;   // 3-5 min = interested
    else if (minutesSpent >= 1) baseScore += 5;    // 1-3 min = browsing
    else baseScore += 2;                           // <1 min = quick look
    
    // 3. Content Consumption (0-15 points) - Scroll depth
    const scrollDepths = this.session.pages.map(p => p.scrollDepth);
    const avgScroll = scrollDepths.length > 0 
      ? scrollDepths.reduce((a, b) => a + b, 0) / scrollDepths.length 
      : 0;
    
    if (avgScroll >= 80) baseScore += 15;         // Read everything thoroughly
    else if (avgScroll >= 60) baseScore += 10;    // Read most content
    else if (avgScroll >= 40) baseScore += 5;     // Skimmed content
    else baseScore += 2;                          // Bounced early
    
    // ========== ENGAGEMENT QUALITY (0-25 points) ==========
    
    // 4. Page Depth (0-10 points) - Number of pages visited
    const pagesVisited = this.session.pages.length;
    if (pagesVisited >= 8) baseScore += 10;       // Deep research
    else if (pagesVisited >= 5) baseScore += 7;   // Good engagement
    else if (pagesVisited >= 3) baseScore += 4;   // Moderate
    else if (pagesVisited >= 2) baseScore += 2;   // Minimal
    
    // 5. Active Interactions (0-10 points) - Clicks, interactions
    const totalInteractions = this.session.pages.reduce((sum, p) => sum + p.interactions, 0);
    baseScore += Math.min(totalInteractions * 1.5, 10);
    
    // 6. Recency Bonus (0-5 points) - Recent activity = higher urgency
    const sessionAge = Date.now() - this.session.startTime;
    const minutesAge = sessionAge / 60000;
    
    if (minutesAge <= 5) baseScore += 5;          // Very recent
    else if (minutesAge <= 15) baseScore += 3;    // Recent
    else if (minutesAge <= 30) baseScore += 1;    // Current session
    
    // ========== URGENCY MULTIPLIER (0.8x - 1.3x) ==========
    
    let multiplier = 1.0;
    
    // Positive signals (increased urgency)
    if (departmentPages >= 2) multiplier += 0.1;     // Multi-department concern
    if (avgScroll >= 70) multiplier += 0.1;          // Thorough reading
    if (totalInteractions >= 5) multiplier += 0.1;   // Active engagement
    
    // Negative signals (decreased urgency)
    if (minutesSpent < 0.5) multiplier -= 0.2;       // Very quick visit
    if (avgScroll < 30) multiplier -= 0.1;           // Low engagement
    
    // Apply multiplier
    const finalScore = Math.round(baseScore * multiplier);
    
    return Math.min(Math.max(finalScore, 0), 100);
  }

  /**
   * Get intent summary
   */
  getIntentSummary() {
    const departmentPages = Object.keys(this.session.departmentInterest);
    const topDepartments = departmentPages
      .sort((a, b) => this.session.departmentInterest[b] - this.session.departmentInterest[a])
      .map(id => this.getDepartmentName(id)); // Convert IDs to names

    const summary = {
      sessionId: this.session.sessionId,
      pagesVisited: this.session.pages.length,
      departmentsViewed: departmentPages.map(id => this.getDepartmentName(id)), // Convert IDs to names
      topDepartments: topDepartments.slice(0, 3),
      totalTimeSpent: Math.round(this.session.totalTimeSpent / 1000), // seconds
      behaviorScore: this.calculateBehaviorScore(),
      engagementLevel: this.getEngagementLevel(),
    };

    console.log('📊 Intent Summary:', summary);
    return summary;
  }

  /**
   * Get engagement level based on medical urgency standards
   */
  getEngagementLevel() {
    const score = this.calculateBehaviorScore();
    if (score >= 75) return 'high';       // Urgent medical need
    if (score >= 50) return 'medium';     // Moderate concern
    if (score >= 25) return 'low';        // General inquiry
    return 'none';                         // Just browsing
  }

  /**
   * Clear session
   */
  clearSession() {
    console.log('🧹 Clearing session');
    localStorage.removeItem(this.sessionKey);
    this.session = this.loadSession();
  }
}

// Create singleton instance
const behaviorTracker = new BehaviorTracker();

export default behaviorTracker;
