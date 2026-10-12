const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, refreshToken, logout, getMe, updateProfile, changePassword, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const loginValidation = [
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty(),
];
const registerValidation = [
  body('name').notEmpty().trim().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'teacher', 'student']),
];

// Optional auth for logout so expired access tokens don't prevent session cleanup
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('../models/User');
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch {}
  }
  next();
};

router.post('/login', loginValidation, login);
router.post('/register', protect, authorize('admin'), registerValidation, register);
router.post('/refresh-token', refreshToken);
router.post('/logout', optionalProtect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
