const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { name, email, password, role, school, class: classId, rollNumber, language, subjects, classes } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already registered' });

  const payload = {
    name,
    email,
    password,
    role,
    school: (school === '' || school === null) ? undefined : (school || req.user?.school),
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
  res.status(201).json({ success: true, message: 'User registered', data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
});

const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil').populate('school', 'name district state');
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
  const refreshToken = user.getRefreshToken();
  const tokens = (user.refreshTokens || []).slice(-4);
  tokens.push({ token: refreshToken, createdAt: new Date() });
  user.refreshTokens = tokens;
  await user.save({ validateBeforeSave: false });
  res.status(200).json({ success: true, token, refreshToken, data: { _id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, class: user.class, language: user.language, streak: user.streak, totalPoints: user.totalPoints, xp: user.xp, level: user.level, badges: user.badges } });
});

const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken: rToken } = req.body;
  if (!rToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
  const jwt = require('jsonwebtoken');
  let decoded;
  try { decoded = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'); }
  catch { return res.status(401).json({ success: false, message: 'Invalid refresh token' }); }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'User not found' });
  if (!user.refreshTokens?.some(rt => rt.token === rToken)) return res.status(401).json({ success: false, message: 'Token revoked' });
  const newToken = user.getSignedJWT();
  const newRefresh = user.getRefreshToken();
  user.refreshTokens = (user.refreshTokens || []).filter(rt => rt.token !== rToken);
  user.refreshTokens.push({ token: newRefresh, createdAt: new Date() });
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, token: newToken, refreshToken: newRefresh });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: rToken } = req.body;
  if (rToken && req.user) await User.findByIdAndUpdate(req.user._id, { $pull: { refreshTokens: { token: rToken } } });
  res.json({ success: true, message: 'Logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('school', 'name district state type').populate('class', 'name grade section');
  res.status(200).json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'language', 'guardianName', 'guardianEmail', 'guardianPhone', 'voiceEnabled', 'offlineMode', 'dailyGoal'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ success: true, data: user });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
  const user = await User.findById(req.user._id).select('+password');
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

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  
  // Generic success message to prevent account enumeration attacks
  const successMsg = 'If a matching account exists, a secure 6-digit OTP has been sent to your email address.';

  if (!user) {
    return res.status(200).json({ success: true, message: successMsg });
  }

  // Generate a cryptographically secure 6-digit numeric OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  // Store SHA-256 hashed OTP, expiry (10 mins), and reset attempts
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

  // In development, log the OTP to the console for local debugging if SMTP is not configured
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

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+passwordResetToken +passwordResetExpires +passwordResetAttempts');

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or reset request.' });
  }

  // 1. Check if an active reset request exists
  if (!user.passwordResetToken || !user.passwordResetExpires) {
    return res.status(400).json({ success: false, message: 'No active password reset request found.' });
  }

  // 2. Check if the OTP has expired
  if (user.passwordResetExpires < Date.now()) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    await user.save({ validateBeforeSave: false });
    return res.status(400).json({ success: false, message: 'The verification code (OTP) has expired. Please request a new one.' });
  }

  // 3. Brute force lock check: limit attempts to 5
  if (user.passwordResetAttempts >= 5) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    await user.save({ validateBeforeSave: false });
    return res.status(429).json({ success: false, message: 'Too many incorrect OTP attempts. The OTP has been invalidated. Please request a new OTP.' });
  }

  // 4. Verify OTP using SHA-256
  const hashedOtpInput = crypto.createHash('sha256').update(otp.trim()).digest('hex');
  if (user.passwordResetToken !== hashedOtpInput) {
    user.passwordResetAttempts += 1;
    await user.save({ validateBeforeSave: false });

    const remaining = 5 - user.passwordResetAttempts;
    if (remaining <= 0) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetAttempts = 0;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Too many incorrect attempts. Please request a new OTP.' });
    }
    return res.status(400).json({ success: false, message: `Incorrect verification code. ${remaining} attempt(s) remaining before block.` });
  }

  // 5. Success! Generate a single-use cryptographically secure reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Save the hashed reset token to passwordResetToken with 5 min expiry
  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  user.passwordResetAttempts = 0;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully. You may now reset your password.',
    resetToken
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
  }

  // Hash the incoming token to compare with the one in DB
  const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');

  // Find user with matching active token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired password reset token. Please verify your OTP again.' });
  }

  // Successful reset! Update password and clear security tokens
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetAttempts = 0;
  
  // Revoke all existing refresh tokens for security (forces logouts on all devices)
  user.refreshTokens = [];
  
  await user.save();

  res.status(200).json({ success: true, message: 'Password has been reset successfully. Please sign in with your new password.' });
});

module.exports = { register, login, refreshToken: refreshTokenHandler, logout, getMe, updateProfile, changePassword, forgotPassword, verifyOTP, resetPassword };
