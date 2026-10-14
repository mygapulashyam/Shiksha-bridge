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
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  const recipientName = escapeHtml(name || 'there');
  const safeOtp = escapeHtml(otp);
  
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'ShikshaBridge Security'}" <${process.env.EMAIL_FROM || 'noreply@shiksha.edu'}>`,
    to: toEmail,
    subject: 'Your ShikshaBridge code is here ✨',
    text: `Hello ${name || 'User'},\n\nWe received a request to reset your password. Use the following 6-digit OTP (One-Time Password) to reset it:\n\n${otp}\n\nThis code is valid for 10 minutes only.\n\nFor your security, NEVER share this code with anyone. If you didn't request a password reset, you can safely ignore this email.\n\nBest regards,\nThe ShikshaBridge Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ShikshaBridge password reset code</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f3ff;font-family:Arial,Helvetica,sans-serif;color:#25234a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your one-time code is ready. Get back to learning with ShikshaBridge.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f2f3ff;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;background-color:#ffffff;border:1px solid #e3e4f2;border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:30px 32px 28px;background-color:#5146d8;background-image:linear-gradient(135deg,#5146d8 0%,#7654e8 100%);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:-0.4px;">&#127891; ShikshaBridge</td>
                  <td align="right"><span style="display:inline-block;padding:7px 11px;background-color:#ffcf5c;border-radius:20px;color:#4a378b;font-size:10px;font-weight:bold;letter-spacing:0.8px;">LEARN &amp; GROW</span></td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;">
                <tr>
                  <td style="padding:7px 11px;background-color:#ffffff;color:#5146d8;border-radius:6px;font-size:11px;font-weight:bold;letter-spacing:1px;">A LITTLE PASSWORD RESET</td>
                </tr>
              </table>
              <h1 style="margin:14px 0 7px;color:#ffffff;font-size:29px;line-height:1.2;letter-spacing:-0.7px;">Your next chapter<br>starts here.</h1>
              <p style="margin:0;color:#e9e5ff;font-size:14px;line-height:1.6;">One quick step, then you're back to learning.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0 0 10px;color:#343054;font-size:16px;font-weight:bold;">Hi ${recipientName} <span style="color:#f29b38;">&#10024;</span></p>
              <p style="margin:0;color:#69677e;font-size:14px;line-height:1.7;">We got your request to reset your password. Enter this code to securely get back into your learning space.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff6dc;border:1px solid #ffe39a;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:22px 16px 20px;">
                    <p style="margin:0 0 11px;color:#8a6820;font-size:11px;font-weight:bold;letter-spacing:1.5px;">YOUR ONE-TIME CODE</p>
                    <div style="color:#403284;font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:bold;letter-spacing:9px;">${safeOtp}</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:12px auto 0;">
                      <tr><td style="padding:6px 10px;background-color:#ffffff;border-radius:20px;color:#776327;font-size:11px;font-weight:bold;">&#9201; &nbsp;Expires in 10 minutes</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="top" style="width:27px;color:#27a37a;font-size:17px;font-weight:bold;">&#10003;</td>
                  <td style="color:#69677e;font-size:12px;line-height:1.6;"><strong style="color:#403284;">Keep your code private.</strong> Our team will never ask you to share it.</td>
                </tr>
              </table>
              <p style="margin:16px 0 0;color:#89879a;font-size:12px;line-height:1.6;">If you didn't request this, no action is needed—your password remains unchanged.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 24px;background-color:#f8f7ff;border-top:1px solid #eeecf8;color:#77758c;font-size:11px;line-height:1.6;">
              Made for curious minds and brighter classrooms<br>
              <strong style="color:#5146d8;">ShikshaBridge</strong> <span style="color:#c2bfd5;">&bull;</span> Learning grows here
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendOTPEmail
};
