const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { syncTeacherClassAssignments } = require('../services/classAssignmentSyncService');

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { name, email, password, role, school, class: classId, rollNumber, language, subjects, classes } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.findOne({ email: normalizedEmail })) return res.status(400).json({ success: false, message: 'Email already registered' });

  const resolvedSchool = (school === '' || school === null) ? undefined : (school || req.user?.school);
  if (role !== 'admin' && !resolvedSchool) {
    return res.status(400).json({ success: false, message: 'School is required for teachers and students' });
  }

  const payload = {
    name,
    email: normalizedEmail,
    password,
    role,
    school: resolvedSchool,
    class: (classId === '' || classId === null) ? undefined : classId,
    rollNumber,
    language: language || 'en',
    subjects: Array.isArray(subjects) ? subjects.filter(Boolean) : [],
    classes: Array.isArray(classes) ? classes.filter(Boolean) : [],
  };

  if (role !== 'student') {
    payload.class = undefined;
    payload.rollNumber = undefined;
  }

  if (role !== 'teacher') {
    payload.subjects = [];
    payload.classes = [];
  }

  const user = await User.create(payload);

  if (user.role === 'teacher' && Array.isArray(payload.classes) && payload.classes.length > 0) {
    await syncTeacherClassAssignments({
      teacherId: user._id,
      previousClassIds: [],
      nextClassIds: payload.classes,
    });
  }

  res.status(201).json({ success: true, message: 'User registered', data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select('+password +loginAttempts +lockUntil +refreshTokens').populate('school', 'name district state');
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (user.isLocked) {
    const minsLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return res.status(423).json({ success: false, message: `Account locked. Try again in ${minsLeft} min.` });
  }
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    const MAX = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const remaining = MAX - (user.loginAttempts + 1);
    return res.status(401).json({ success: false, message: remaining > 0 ? `Invalid credentials. ${remaining} attempt(s) left before lock.` : 'Account locked.' });
  }
  if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });
  await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  user.lastLogin = new Date();
  const token = user.getSignedJWT();
  const rawRefreshToken = user.getRefreshToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);
  const tokens = (user.refreshTokens || []).slice(-4);
  tokens.push({ token: hashedRefreshToken, createdAt: new Date() });
  user.refreshTokens = tokens;
  await user.save({ validateBeforeSave: false });

  // Sanitize user object sent to client (do not include refreshTokens)
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    school: user.school,
    class: user.class,
    language: user.language,
    streak: typeof user.getEffectiveStreak === 'function' ? user.getEffectiveStreak() : user.streak,
    totalPoints: user.totalPoints,
    xp: user.xp,
    level: user.level,
    badges: user.badges,
  };

  res.status(200).json({ success: true, token, refreshToken: rawRefreshToken, data: userData });
});

const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken: rToken } = req.body;
  if (!rToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'); }
  catch { return res.status(401).json({ success: false, message: 'Invalid refresh token' }); }
  const user = await User.findById(decoded.id).select('+refreshTokens');
  if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'User not found' });
  const hashedInputToken = hashToken(rToken);
  if (!user.refreshTokens?.some(rt => rt.token === hashedInputToken)) return res.status(401).json({ success: false, message: 'Token revoked' });

  const newToken = user.getSignedJWT();
  const newRefresh = user.getRefreshToken();
  const newHashedRefresh = hashToken(newRefresh);

  user.refreshTokens = (user.refreshTokens || []).filter(rt => rt.token !== hashedInputToken);
  user.refreshTokens.push({ token: newHashedRefresh, createdAt: new Date() });
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, token: newToken, refreshToken: newRefresh });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: rToken } = req.body;
  if (rToken) {
    const hashed = hashToken(rToken);
    await User.updateMany({ 'refreshTokens.token': hashed }, { $pull: { refreshTokens: { token: hashed } } });
  }
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokens: [] } });
  }
  res.json({ success: true, message: 'Logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-refreshTokens').populate('school', 'name district state type').populate('class', 'name grade section');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const userObj = user.toObject();
  if (typeof user.getEffectiveStreak === 'function') {
    userObj.streak = user.getEffectiveStreak();
  }
  delete userObj.refreshTokens;
  res.status(200).json({ success: true, data: userObj });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'language', 'guardianName', 'guardianEmail', 'guardianPhone', 'voiceEnabled', 'offlineMode', 'dailyGoal'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-refreshTokens').populate('school', 'name district state type').populate('class', 'name grade section');
  const userObj = user ? user.toObject() : {};
  delete userObj.refreshTokens;
  res.status(200).json({ success: true, data: userObj });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  const user = await User.findById(req.user._id).select('+password +refreshTokens');
  if (!await user.matchPassword(currentPassword)) return res.status(401).json({ success: false, message: 'Current password incorrect' });
  user.password = newPassword;
  user.refreshTokens = [];
  await user.save();
  res.status(200).json({ success: true, message: 'Password updated. Please login again.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  
  const successMsg = 'If a matching account exists, a secure 6-digit OTP has been sent to your email address.';

  if (!user) {
    return res.status(200).json({ success: true, message: successMsg });
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = hashToken(otp);

  user.passwordResetToken = hashedOtp;
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.passwordResetAttempts = 0;

  await user.save({ validateBeforeSave: false });

  let emailSent = false;
  try {
    const { sendOTPEmail } = require('../services/emailService');
    await sendOTPEmail(user.email, otp, user.name);
    emailSent = true;
  } catch (err) {
    console.error('Failed to send password reset OTP email:', err);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV MODE] OTP generated for ${user.email}: ${otp}`);
    return res.status(200).json({
      success: true,
      message: `${successMsg} ${emailSent ? '' : '(Dev note: SMTP not configured, OTP printed in backend console.)'}`
    });
  }

  res.status(200).json({ success: true, message: successMsg });
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Atomic increment attempt counter on the active reset request to prevent race conditions
  const user = await User.findOneAndUpdate(
    {
      email: normalizedEmail,
      passwordResetToken: { $exists: true, $ne: null },
      passwordResetExpires: { $gt: new Date() },
    },
    { $inc: { passwordResetAttempts: 1 } },
    { new: true }
  ).select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or verification request expired. Please request a new OTP.' });
  }

  if (user.passwordResetAttempts > 5) {
    await User.findByIdAndUpdate(user._id, {
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
      $set: { passwordResetAttempts: 0 },
    });
    return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. The OTP has been invalidated. Please request a new OTP.' });
  }

  const hashedOtpInput = hashToken(otp.trim());
  if (user.passwordResetToken !== hashedOtpInput) {
    const remaining = Math.max(0, 5 - user.passwordResetAttempts);
    if (remaining === 0) {
      await User.findByIdAndUpdate(user._id, {
        $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
        $set: { passwordResetAttempts: 0 },
      });
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempt(s) remaining before block.` });
  }

  // Success! Generate single-use reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = hashToken(resetToken);

  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  user.passwordResetAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully. You may now reset your password.',
    resetToken,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  const hashedToken = hashToken(token.trim());

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset token. Please verify your OTP again.' });
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;
  // Clear any existing account lock
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  // Revoke all existing refresh tokens
  user.refreshTokens = [];

  await user.save();

  res.status(200).json({ success: true, message: 'Password has been reset successfully. Please sign in with your new password.' });
});

module.exports = { register, login, refreshToken: refreshTokenHandler, logout, getMe, updateProfile, changePassword, forgotPassword, verifyOTP, resetPassword };
