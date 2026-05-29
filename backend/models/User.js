const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: [100, 'Name max 100 chars'] },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Valid email required'] },
    password: { type: String, required: [true, 'Password is required'], minlength: [6, 'Min 6 chars'], select: false },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    rollNumber: { type: String, trim: true },
    language: { type: String, enum: ['en', 'hi', 'gu', 'te', 'mr', 'ta', 'kn', 'bn'], default: 'en' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    // Gamification
    streak: { type: Number, default: 0 },
    lastActivityDate: { type: Date },
    badges: [{ name: String, awardedAt: Date, icon: String }],
    totalPoints: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    dailyGoal: { type: Number, default: 2 }, // quizzes per day
    dailyCompleted: { type: Number, default: 0 },
    dailyGoalDate: { type: Date },

    // Security – Account Lock
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },

    // Security – Password Reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },

    // Security – Refresh Tokens
    refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],

    // Parent/Guardian contact
    guardianName: { type: String, trim: true },
    guardianEmail: { type: String, trim: true, lowercase: true },
    guardianPhone: { type: String, trim: true },

    // Preferences
    voiceEnabled: { type: Boolean, default: false },
    offlineMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Check if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function () {
  const MAX = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const LOCK_MINS = parseInt(process.env.LOCK_TIME_MINUTES) || 30;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Lock expired – reset
    return await this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_MINS * 60 * 1000) };
  }
  return await this.updateOne(updates);
};

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

userSchema.methods.getSignedJWT = function () {
  return jwt.sign({ id: this._id, role: this.role, school: this.school }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' });
};

userSchema.methods.getPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  return token;
};

userSchema.methods.updateStreak = function () {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = this.lastActivityDate ? new Date(this.lastActivityDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diff = (today - last) / 86400000;
    if (diff === 1) this.streak += 1;
    else if (diff > 1) this.streak = 1;
  } else { this.streak = 1; }
  this.lastActivityDate = new Date();
};

userSchema.methods.addXP = function (points) {
  this.xp += points;
  this.totalPoints += points;
  // Level up every 500 XP
  this.level = Math.floor(this.xp / 500) + 1;
};

module.exports = mongoose.model('User', userSchema);
