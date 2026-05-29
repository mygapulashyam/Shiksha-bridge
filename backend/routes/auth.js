const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { register, login, refreshToken, logout, getMe, updateProfile, changePassword, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

const loginValidation = [body('email').isEmail(), body('password').notEmpty()];
const registerValidation = [body('name').notEmpty().trim().isLength({ max: 100 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 }), body('role').isIn(['admin', 'teacher', 'student'])];

router.post('/login', loginValidation, login);
router.post('/register', protect, authorize('admin'), registerValidation, register);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;
