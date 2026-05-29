const nodemailer = require('nodemailer');

// Create the transporter using environment variables
// Note: We use values from .env securely
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // true for port 465, false otherwise
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

/**
 * Sends a beautifully styled OTP email for password reset verification
 * @param {string} toEmail - The recipient's email address
 * @param {string} otp - The 6-digit verification code
 * @param {string} name - The user's name
 */
const sendOTPEmail = async (toEmail, otp, name) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'ShikshaBridge Security'}" <${process.env.EMAIL_FROM || 'noreply@shiksha.edu'}>`,
    to: toEmail,
    subject: '🔒 Reset Your ShikshaBridge Password - Security Code',
    text: `Hello ${name || 'User'},\n\nWe received a request to reset your password. Use the following 6-digit OTP (One-Time Password) to reset it:\n\n${otp}\n\nThis code is valid for 10 minutes only.\n\nFor your security, NEVER share this code with anyone. If you didn't request a password reset, you can safely ignore this email.\n\nBest regards,\nThe ShikshaBridge Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShikshaBridge Security Code</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f7f6f5;
      margin: 0;
      padding: 0;
      color: #3d3830;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(28,25,20,0.06);
      border: 1px solid #e8e5e0;
    }
    .email-header {
      background: linear-gradient(135deg, #1b7a4e 0%, #145c3a 100%);
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      color: #f5b820;
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px 35px;
    }
    .email-body h2 {
      color: #1c1914;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .email-body p {
      font-size: 15px;
      line-height: 1.6;
      color: #7a7268;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .otp-container {
      background-color: #fff3e8;
      border: 2px dashed #e8650a;
      border-radius: 12px;
      padding: 20px 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #e8650a;
      letter-spacing: 8px;
    }
    .otp-expiry {
      font-size: 12px;
      color: #c4530a;
      margin-top: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .security-notice {
      background-color: #fafaf9;
      border-left: 4px solid #f5b820;
      padding: 16px 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }
    .security-notice p {
      font-size: 13px;
      color: #7a7268;
      margin: 0;
      line-height: 1.5;
    }
    .email-footer {
      background-color: #fafaf9;
      padding: 24px 35px;
      border-top: 1px solid #e8e5e0;
      text-align: center;
      font-size: 12px;
      color: #9e9688;
    }
    .email-footer a {
      color: #e8650a;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>🎓 ShikshaBridge</h1>
    </div>
    <div class="email-body">
      <h2>Hello, ${name || 'User'} 👋</h2>
      <p>We received a request to reset the password for your ShikshaBridge account. Please use the secure, one-time verification code (OTP) below to complete your reset process:</p>
      
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">Valid for 10 minutes only</div>
      </div>
      
      <div class="security-notice">
        <p><strong>🔒 Security Alert:</strong> For your account security, never share this OTP with anyone, including teachers or administrators of ShikshaBridge. Our team will never ask for your code.</p>
      </div>
      
      <p>If you did not request a password reset, you can safely ignore this email. Your current password remains secure.</p>
    </div>
    <div class="email-footer">
      &copy; 2026 ShikshaBridge. Bridging classrooms across India.<br>
      Need assistance? Contact your school administrator.
    </div>
  </div>
</body>
</html>
`
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendOTPEmail
};
