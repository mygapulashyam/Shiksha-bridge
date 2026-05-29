import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage, languagesList } from '../context/LanguageContext';
import api from '../api/axios';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, t } = useLanguage();

  // Views: 'login', 'forgot', 'otp', 'reset'
  const [view, setView] = useState('login');

  // Form states
  const [form, setForm] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetForm, setResetForm] = useState({ newPassword: '', confirmPassword: '' });

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Already logged in
  if (user) { navigate(`/${user.role}`); return null; }

  // Handle Login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.email || !form.password) { setError(t('signin_desc')); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      navigate(`/${u.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Request OTP (Forgot password)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!forgotEmail) { setError(t('forgot_password_desc')); return; }

    // Simple email validation
    if (!/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: forgotEmail });
      setSuccess(data.message);
      setView('otp'); // Switch to secure OTP verification view
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification
  const handleVerifyOTPSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!otpInput) { setError('Please enter the 6-digit verification code.'); return; }

    if (otpInput.trim().length !== 6 || isNaN(otpInput.trim())) {
      setError('Verification code (OTP) must be a 6-digit number.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: forgotEmail,
        otp: otpInput.trim()
      });
      setSuccess(data.message);
      setResetToken(data.resetToken); // Save the single-use reset token
      setView('reset'); // Enable password reset view
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const { newPassword, confirmPassword } = resetForm;

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword
      });
      setSuccess(data.message);
      setView('login');
      // Reset all forms
      setForm({ email: forgotEmail, password: '' });
      setForgotEmail('');
      setOtpInput('');
      setResetToken('');
      setResetForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left – Branding */}
      <div className="login-left">
        <div style={{ maxWidth: 480 }}>
          <div className="login-logo">🎓 ShikshaBridge</div>
          <div className="login-tagline">
            {t('tagline')}
          </div>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '📊', title: t('f1_title'), desc: t('f1_desc') },
              { icon: '🎯', title: t('f2_title'), desc: t('f2_desc') },
              { icon: '📈', title: t('f3_title'), desc: t('f3_desc') },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '1.5rem', marginTop: 2 }}>{f.icon}</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem' }}>{f.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, padding: '16px 20px', background: 'rgba(245,184,32,0.12)', borderRadius: 12, border: '1px solid rgba(245,184,32,0.25)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>🌐 {t('multilingual')}</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              English · हिंदी · मराठी · தமிழ் · తెలుగు ·  ಕನ್ನಡ · বাংলা
            </div>
          </div>
        </div>
      </div>

      {/* Right – Interactive Form Container */}
      <div className="login-right">
        <div style={{ width: '100%', maxWidth: 380 }}>
          
          {/* Beautiful Premium Language Dropdown Selector */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="form-input form-select"
              style={{
                maxWidth: 160,
                padding: '6px 12px',
                fontSize: '0.82rem',
                height: 'auto',
                backgroundColor: 'var(--gray-50)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--gray-300)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {languagesList.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Headers */}
          {view === 'login' && (
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>{t('welcome')}</h1>
              <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: '0.9rem' }}>{t('signin_desc')}</p>
            </div>
          )}

          {view === 'forgot' && (
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>{t('forgot_password_title')}</h1>
              <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: '0.9rem' }}>{t('forgot_password_desc')}</p>
            </div>
          )}

          {view === 'otp' && (
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>{t('verify_title')}</h1>
              <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: '0.9rem' }}>{t('verify_desc')}</p>
            </div>
          )}

          {view === 'reset' && (
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gray-900)' }}>{t('reset_title')}</h1>
              <p style={{ color: 'var(--gray-500)', marginTop: 6, fontSize: '0.9rem' }}>{t('reset_desc')}</p>
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>❌</span><span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span>✅</span><span>{success}</span>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input className="form-input" type="email" placeholder="you@school.edu" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>{t('password')}</label>
                  <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {t('forgot_password')}
                  </button>
                </div>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} autoComplete="current-password" />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? t('signing_in') : t('signin_btn')}
              </button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label className="form-label">{t('email')}</label>
                <input className="form-input" type="email" placeholder="you@school.edu" value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)} autoComplete="email" />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? t('sending_otp') : t('send_otp')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button type="button" onClick={() => { setView('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('back_signin')}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: VERIFY OTP */}
          {view === 'otp' && (
            <form onSubmit={handleVerifyOTPSubmit}>
              <div className="form-group">
                <label className="form-label">6-Digit Security Code (OTP)</label>
                <input className="form-input" type="text" maxLength="6" placeholder="123456" value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))} style={{ fontFamily: 'monospace', letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center' }} />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? t('verifying') : t('verify_btn')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <button type="button" onClick={() => { setView('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('back_signin')}
                </button>
                <button type="button" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('resend_otp')}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RESET PASSWORD */}
          {view === 'reset' && (
            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label className="form-label">{t('new_password')}</label>
                <input className="form-input" type="password" placeholder="••••••••" value={resetForm.newPassword}
                  onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('confirm_password')}</label>
                <input className="form-input" type="password" placeholder="••••••••" value={resetForm.confirmPassword}
                  onChange={e => setResetForm(p => ({ ...p, confirmPassword: e.target.value }))} />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? t('resetting') : t('reset_btn')}
              </button>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button type="button" onClick={() => { setView('login'); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: 'var(--gray-500)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('cancel_signin')}
                </button>
              </div>
            </form>
          )}

          <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8rem', marginTop: 24 }}>
            {t('contact_admin')}
          </p>
        </div>
      </div>
    </div>
  );
}
