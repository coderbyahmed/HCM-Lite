import { Announcement, Notification } from '../models/index.js';
import { logAudit } from '../services/audit.service.js';

export const listAnnouncements = async (req, res, next) => {
  try {
    const list = await Announcement.find({}).sort({ createdAt: -1 });
    res.json({ success: true, announcements: list });
  } catch (err) {
    next(err);
  }
};

export const createAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const ann = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      priority: priority || 'normal',
      category: category || 'General',
      authorName: req.user.name,
      createdBy: req.user._id,
    });

    await logAudit({
      userId: req.user._id,
      userRole: req.user.role,
      action: 'CREATE_ANNOUNCEMENT',
      entity: 'Announcement',
      entityId: ann._id,
      details: { title, priority },
      ip: req.ip,
    });

    res.status(201).json({ success: true, announcement: ann });
  } catch (err) {
    next(err);
  }
};

export const listNotifications = async (req, res, next) => {
  try {
    const query = {
      $or: [
        { recipientId: req.user._id },
        { recipientRole: req.user.role },
        { recipientRole: 'all' },
      ],
    };

    const notifs = await Notification.find(query).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications: notifs });
  } catch (err) {
    next(err);
  }
};
