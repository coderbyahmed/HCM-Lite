import { isFirstRun, setupFirstRunCompany } from '../services/organization.service.js';
import { loginUser, refreshToken, changePassword, createHRUser, toggleUserStatus } from '../services/auth.service.js';
import { User, Employee } from '../models/index.js';

export const checkSetupStatus = async (req, res, next) => {
  try {
    const needed = await isFirstRun();
    res.json({
      success: true,
      isFirstRun: needed,
    });
  } catch (err) {
    next(err);
  }
};

export const setupFirstRun = async (req, res, next) => {
  try {
    const { companyName, adminName, adminEmail, adminPassword } = req.body;
    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'companyName, adminName, adminEmail, and adminPassword are required for first-run setup.',
      });
    }

    const result = await setupFirstRunCompany({
      ...req.body,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Company and initial Administrator successfully initialized.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await loginUser({ email, password, ip: req.ip });

    // Set HttpOnly refresh token cookie if supported
    res.cookie('hcm_refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      message: 'Authentication successful.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const incomingToken = req.body.refreshToken || req.cookies?.hcm_refresh_token;
    const tokens = await refreshToken(incomingToken);
    res.json({ success: true, tokens });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('hcm_refresh_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  });
  res.json({ success: true, message: 'Successfully logged out.' });
};

export const changeUserPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }

    const result = await changePassword({
      userId: req.user._id,
      oldPassword,
      newPassword,
      ip: req.ip,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    let employee = null;
    if (user?.employeeId) {
      employee = await Employee.findById(user.employeeId);
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        mustChangePassword: user.mustChangePassword,
        status: user.status,
      },
      employee,
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    const safeUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      employeeId: u.employeeId,
      createdAt: u.createdAt,
    }));
    res.json({ success: true, users: safeUsers });
  } catch (err) {
    next(err);
  }
};

export const createHR = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const hr = await createHRUser({ name, email, password }, req.user, req.ip);
    res.status(201).json({ success: true, data: hr });
  } catch (err) {
    next(err);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await toggleUserStatus(userId, req.user, req.ip);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
