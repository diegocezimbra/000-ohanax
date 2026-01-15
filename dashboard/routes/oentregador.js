import express from 'express';
import { db } from '../db.js';
const router = express.Router();

// =============================================================================
// OENTREGADOR - USER STATS
// =============================================================================

router.get('/users', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');

    const total = await users.countDocuments();
    const active = await users.countDocuments({ isActive: true });
    const admins = await users.countDocuments({ userRole: 'admin' });
    const regularUsers = await users.countDocuments({ userRole: 'user' });
    const verified = await users.countDocuments({ isStep01VerifyEmailCompleted: true });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newLast30Days = await users.countDocuments({
      userCreatedAt: { $gte: thirtyDaysAgo }
    });

    // Companies count
    const companies = mongoDB.collection('app_companies');
    const totalCompanies = await companies.countDocuments();
    const activeCompanies = await companies.countDocuments({ companyStatus: 'active' });

    res.json({ total, active, admins, regularUsers, verified, newLast30Days, totalCompanies, activeCompanies });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: err.message, total: 0, active: 0, admins: 0, regularUsers: 0, verified: 0, newLast30Days: 0, totalCompanies: 0, activeCompanies: 0 });
  }
});

router.get('/users/list', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');

    const userList = await users.find({}, {
      projection: {
        userName: 1,
        userEmail: 1,
        userRole: 1,
        isActive: 1,
        userCreatedAt: 1,
        isStep01VerifyEmailCompleted: 1
      }
    }).sort({ userCreatedAt: -1 }).limit(100).toArray();

    res.json(userList);
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json([]);
  }
});

// =============================================================================
// OENTREGADOR - COMPANIES
// =============================================================================

router.get('/companies', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const companies = mongoDB.collection('app_companies');
    const companyList = await companies.find({}, {
      projection: {
        companyName: 1,
        companyCnpj: 1,
        companyStatus: 1,
        companyCreatedAt: 1
      }
    }).sort({ companyCreatedAt: -1 }).toArray();
    res.json(companyList);
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json([]);
  }
});

// =============================================================================
// OENTREGADOR - DRIVERS
// =============================================================================

router.get('/drivers', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const drivers = mongoDB.collection('delivery_drivers');

    const stats = await drivers.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalPackages: { $sum: '$stats.totalPackages' },
          completedPackages: { $sum: '$stats.completedPackages' },
          avgCompletionRate: { $avg: '$stats.completionRate' }
        }
      }
    ]).toArray();

    res.json(stats[0] || { total: 0, totalPackages: 0, completedPackages: 0, avgCompletionRate: 0 });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, totalPackages: 0, completedPackages: 0, avgCompletionRate: 0 });
  }
});

// =============================================================================
// OENTREGADOR - BATCHES
// =============================================================================

router.get('/batches', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const batches = mongoDB.collection('delivery_batches');

    const stats = await batches.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$appStatus',
          count: { $sum: 1 },
          totalPackages: { $sum: '$appTotalPackages' },
          completedPackages: { $sum: '$appCompletedPackages' }
        }
      }
    ]).toArray();

    const total = await batches.countDocuments({ deletedAt: null });

    res.json({ total, byStatus: stats });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, byStatus: [] });
  }
});

// =============================================================================
// OENTREGADOR - PACKAGES
// =============================================================================

router.get('/packages', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const packages = mongoDB.collection('delivery_packages');

    const stats = await packages.aggregate([
      {
        $group: {
          _id: '$appStatus',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const total = await packages.countDocuments();

    res.json({ total, byStatus: stats });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, byStatus: [] });
  }
});

// =============================================================================
// OENTREGADOR - TODAY'S ACTIVITY
// =============================================================================

// Today's activity: users who logged in + items bipados
router.get('/today', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');
    const packages = mongoDB.collection('delivery_packages');

    // Start of today (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Users active today (based on userLastLoginAt)
    const activeUsersToday = await users.find({
      userLastLoginAt: { $gte: today }
    }).project({
      userName: 1,
      userEmail: 1,
      userLastLoginAt: 1
    }).sort({ userLastLoginAt: -1 }).toArray();

    // Items bipados today (conferenceAt is when they were scanned)
    // Includes both 'checked' (ok) and 'wrong_batch' (divergencia/pendencia)
    const bipadosToday = await packages.countDocuments({
      conferenceStatus: { $in: ['checked', 'wrong_batch'] },
      conferenceAt: { $gte: today }
    });

    // Get bipados by user today
    const bipadosByUser = await packages.aggregate([
      {
        $match: {
          conferenceStatus: { $in: ['checked', 'wrong_batch'] },
          conferenceAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$conferenceUserName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      activeUsers: activeUsersToday.length,
      activeUsersList: activeUsersToday.slice(0, 20),
      bipadosToday: bipadosToday,
      bipadosByUser: bipadosByUser
    });
  } catch (err) {
    console.error('MongoDB error in today stats:', err);
    res.json({ activeUsers: 0, activeUsersList: [], bipadosToday: 0, bipadosByUser: [] });
  }
});

// =============================================================================
// OENTREGADOR - BIPADOS PER DAY
// =============================================================================

// Bipados per day (last 30 days)
router.get('/bipados-per-day', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const packages = mongoDB.collection('delivery_packages');

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate bipados by day (conferenceAt when status != pending)
    const result = await packages.aggregate([
      {
        $match: {
          conferenceStatus: { $in: ['checked', 'wrong_batch'] },
          conferenceAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$conferenceAt' }
          },
          total: { $sum: 1 },
          checked: {
            $sum: { $cond: [{ $eq: ['$conferenceStatus', 'checked'] }, 1, 0] }
          },
          wrong_batch: {
            $sum: { $cond: [{ $eq: ['$conferenceStatus', 'wrong_batch'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Fill missing days with zeros
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const found = result.find(r => r._id === dateStr);
      data.push({
        date: dateStr,
        total: found ? found.total : 0,
        checked: found ? found.checked : 0,
        wrong_batch: found ? found.wrong_batch : 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('MongoDB error in bipados-per-day:', err);
    res.json([]);
  }
});

// =============================================================================
// OENTREGADOR - AUDIT LOGS
// =============================================================================

// Get audit logs with filters
router.get('/audit/logs', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const {
      page = 1,
      limit = 50,
      category,
      status,
      userId,
      companyId,
      action,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (companyId) query.companyId = companyId;
    if (action) query.action = { $regex: action, $options: 'i' };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      auditLogs
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      auditLogs.countDocuments(query)
    ]);

    res.json({
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit stats
router.get('/audit/stats', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { period = 'week', companyId } = req.query;

    // Calculate start date based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const matchQuery = { timestamp: { $gte: startDate } };
    if (companyId) matchQuery.companyId = companyId;

    // Get counts by category
    const byCategory = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();

    // Get counts by status
    const byStatus = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    // Get top actions
    const topActions = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get top users
    const topUsers = await auditLogs.aggregate([
      { $match: { ...matchQuery, userId: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get total count
    const totalLogs = await auditLogs.countDocuments(matchQuery);

    // Convert arrays to objects
    const categoryObj = {
      auth: 0, bipagem: 0, config: 0, sync: 0, crud: 0, system: 0, financial: 0
    };
    byCategory.forEach(c => { if (c._id) categoryObj[c._id] = c.count; });

    const statusObj = { success: 0, failure: 0, error: 0 };
    byStatus.forEach(s => { if (s._id) statusObj[s._id] = s.count; });

    res.json({
      totalLogs,
      byCategory: categoryObj,
      byStatus: statusObj,
      topActions: topActions.map(a => ({ action: a._id, count: a.count })),
      topUsers: topUsers.map(u => ({
        userId: u._id,
        userName: u.userName || 'Unknown',
        userEmail: u.userEmail,
        count: u.count
      })),
      period: {
        start: startDate,
        end: now,
        name: period
      }
    });
  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit activity timeline (logs per day)
router.get('/audit/timeline', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await auditLogs.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]).toArray();

    // Fill missing days and organize by status
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = {
        date: dateStr,
        success: 0,
        failure: 0,
        error: 0,
        total: 0
      };

      result.filter(r => r._id.date === dateStr).forEach(r => {
        if (r._id.status && dayData.hasOwnProperty(r._id.status)) {
          dayData[r._id.status] = r.count;
          dayData.total += r.count;
        }
      });

      data.push(dayData);
    }

    res.json({ data });
  } catch (err) {
    console.error('Error fetching audit timeline:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity for a user
router.get('/audit/user/:userId', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const logs = await auditLogs
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ data: logs });
  } catch (err) {
    console.error('Error fetching user audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity for a company
router.get('/audit/company/:companyId', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const logs = await auditLogs
      .find({ companyId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ data: logs });
  } catch (err) {
    console.error('Error fetching company audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
