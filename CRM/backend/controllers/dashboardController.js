// backend/controllers/dashboardController.js

const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const User = require('../models/User');

/**
 * Get Dashboard Analytics
 * GET /api/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const { role, _id: userId } = req.user;
    
    // --- 1. Define Match Criteria based on Role ---
    // Admin sees all data. Executives see only their assigned data.
    const leadMatch = role === 'Executive' ? { assignedTo: userId, archived: false } : { archived: false };
    const activityMatch = role === 'Executive' ? { user: userId } : {};

    // --- 2. Run Parallel Queries for Efficiency ---
    const [
      totalLeads,
      archivedLeads,
      funnelCounts,
      activityTypes,
      monthlyInflow,
      topActiveUsers
    ] = await Promise.all([
      
      // A. Total Active Leads
      Lead.countDocuments(leadMatch),

      // B. Total Archived Leads (Admin only usually, but good for stats)
      Lead.countDocuments({ ...leadMatch, archived: true }),

      // C. Sales Funnel (Group by Status)
      Lead.aggregate([
        { $match: leadMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // D. Activity Breakdown (Group by Type)
      Activity.aggregate([
        { $match: activityMatch },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } } // Most frequent first
      ]),

      // E. Monthly Lead Inflow (Last 6 Months)
      Lead.aggregate([
        { $match: leadMatch },
        { 
          $group: { 
            _id: { 
              year: { $year: "$createdAt" }, 
              month: { $month: "$createdAt" } 
            }, 
            count: { $sum: 1 } 
          } 
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),

      // F. Top Active Users (Admin View Only)
      role === 'Admin' ? Activity.aggregate([
        { $group: { _id: '$user', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
        { $unwind: '$userInfo' },
        { $project: { _id: 1, count: 1, username: '$userInfo.username' } }
      ]) : Promise.resolve([])
    ]);

    // --- 3. Format Data for Frontend ---
    
    // Convert Funnel Array to Object: { "New": 10, "Won": 5 }
    const funnelMap = {};
    funnelCounts.forEach(item => {
      funnelMap[item._id] = item.count;
    });

    // Calculate basic Conversion Rate (Won / Total) * 100
    const wonCount = funnelMap['Won'] || 0;
    const conversionRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : 0;

    // Calculate Avg Time to Conversion (Mock logic: In a real app, you'd diff timestamps from 'Create' to 'Won' activity logs)
    // For now, we will return placeholders or calculated stats if available
    const avgTimeToConverted = "N/A"; 

    res.status(200).json({
      success: true,
      analytics: {
        totalLeads,
        archivedLeads,
        conversionRate,
        avgTimeToConverted,
        funnelCounts: funnelMap,
        activityTypes,
        monthlyInflow,
        topActiveUsers
      }
    });

  } catch (error) {
    console.error('❌ Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard analytics', error: error.message });
  }
};

module.exports = { getDashboardStats };
