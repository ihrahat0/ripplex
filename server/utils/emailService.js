const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const fs = require('fs');
const path = require('path');

// Create transporter with configuration from environment
const createTransporter = () => {
  console.log('Creating email transporter with these settings:', {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true'
  });

  try {
    // Create a more robust transport configuration
    const transportOptions = smtpTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'verify.rippleexchange@gmail.com',
        pass: process.env.EMAIL_PASS || 'nlob twdl jmqq atux'
      },
      tls: {
        rejectUnauthorized: false // To handle some certificate issues in certain environments
      },
      debug: true // Enable debug logging
    });

    const transporter = nodemailer.createTransport(transportOptions);
    
    // Verify the connection immediately to catch any issues
    transporter.verify(function(error, success) {
      if (error) {
        console.error('Email transporter verification error:', error);
        throw new Error(`Failed to verify email transport: ${error.message}`);
      } else {
        console.log('✅ Email server is ready to send messages');
      }
    });
    
    return transporter;
  } catch (err) {
    console.error('❌ Failed to create email transporter:', err);
    throw new Error(`Email service initialization failed: ${err.message}`);
  }
};

// Save a copy of emails for debugging (optional for production)
const saveEmailCopy = (to, subject, html) => {
  try {
    const emailsDir = path.join(__dirname, '../../emails');
    
    if (!fs.existsSync(emailsDir)) {
      fs.mkdirSync(emailsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(emailsDir, `${timestamp}-${to.replace('@', '-at-')}.html`);
    
    fs.writeFileSync(filename, html);
    console.log(`Email saved to ${filename}`);
  } catch (err) {
    console.error('Error saving email copy:', err.message);
  }
};

// Send verification email for registration with improved security and logging
const sendVerificationEmail = async (email, code) => {
  try {
    console.log(`📧 Attempting to send verification email to ${email}`);
    
    if (!email) {
      console.error('Missing email address');
      return { success: false, error: 'Email address is required' };
    }
    
    if (!code) {
      console.error('Missing verification code');
      return { success: false, error: 'Verification code is required' };
    }
    
    try {
      const transporter = createTransporter();
      
      // Never log the actual verification code
      console.log(`Verification code generated for ${email} (code hidden for security)`);
      
      // Email HTML template
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: #0c1021; color: #fff;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #2a2a3c;">
            <h1 style="color: #4A6BF3; margin: 0;">Ripple Exchange</h1>
          </div>
          <div style="background-color: #1a1b2a; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #2a2a3c;">
            <h2 style="color: #fff; text-align: center; margin-bottom: 25px; font-weight: 600;">Security Verification</h2>
            <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello,</p>
            <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Your security verification code for Ripple Exchange is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: linear-gradient(135deg, #4A6BF3, #2a3c82); border-radius: 8px; display: inline-block; color: #fff; box-shadow: 0 4px 10px rgba(74, 107, 243, 0.3);">${code}</div>
            </div>
            <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">This code will expire in 10 minutes.</p>
            <p style="color: #cccccc; line-height: 1.6; font-size: 16px; margin-top: 25px; background-color: rgba(74, 107, 243, 0.1); padding: 15px; border-left: 4px solid #4A6BF3; border-radius: 4px;">
              <strong style="color: #fff;">Security Tip:</strong> Never share this code with anyone. Ripple Exchange representatives will never ask for this code.
            </p>
            <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">If you did not request this code, please contact our security team immediately.</p>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
            <p>© 2024 Ripple Exchange. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `;
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'verify.rippleexchange@gmail.com',
        to: email,
        subject: 'Verification Code - Ripple Exchange',
        html: html
      };
      
      console.log('Sending email with transporter');
      
      // Save a copy for debugging
      try {
        saveEmailCopy(email, mailOptions.subject, html);
      } catch (saveError) {
        console.log('Warning: Could not save email copy:', saveError.message);
        // Don't fail if we can't save a copy
      }
      
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      
      return { 
        success: true, 
        message: 'Verification email sent successfully', 
        messageId: info.messageId 
      };
    } catch (error) {
      console.error('Error in email sending function:', error);
      return { 
        success: false, 
        error: `Failed to send email: ${error.message}`
      };
    }
  } catch (error) {
    console.error('Critical error in email service:', error);
    return { 
      success: false, 
      error: `Email service failure: ${error.message}` 
    };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, code) => {
  try {
    const transporter = createTransporter();
    
    // Email HTML template
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: #0c1021; color: #fff;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #2a2a3c;">
          <img src="https://rippleexchange.org/static/media/logo.fb82fbabcd2b7e76a491.png" alt="Ripple Exchange Logo" style="max-width: 200px; height: auto;">
        </div>
        <div style="background-color: #1a1b2a; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #2a2a3c;">
          <h2 style="color: #fff; text-align: center; margin-bottom: 25px; font-weight: 600;">Password Reset</h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello,</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">We received a request to reset your password. Your verification code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: linear-gradient(135deg, #4A6BF3, #2a3c82); border-radius: 8px; display: inline-block; color: #fff; box-shadow: 0 4px 10px rgba(74, 107, 243, 0.3);">${code}</div>
          </div>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">This code will expire in 10 minutes.</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px; margin-top: 25px; background-color: rgba(246, 70, 93, 0.1); padding: 15px; border-left: 4px solid #F6465D; border-radius: 4px;">
            <strong style="color: #fff;">Security Notice:</strong> If you did not request this password reset, please contact our security team immediately.
          </p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
          <p>&copy; ${new Date().getFullYear()} Ripple Exchange. All rights reserved.</p>
          <p>This is a system-generated email. Please do not reply.</p>
        </div>
      </div>
    `;
    
    // Save a copy (for debugging)
    saveEmailCopy(email, 'Password Reset', html);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Ripple Exchange" <verify.rippleexchange@gmail.com>',
      to: email,
      subject: 'Ripple Exchange: Password Reset Request',
      html: html
    });
    
    console.log(`Password reset email sent to ${email} (MessageID: ${info.messageId})`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send password change confirmation email
const sendPasswordChangeConfirmation = async (email) => {
  try {
    const transporter = createTransporter();
    
    // Email HTML template
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: #0c1021; color: #fff;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #2a2a3c;">
          <img src="https://rippleexchange.org/static/media/logo.fb82fbabcd2b7e76a491.png" alt="Ripple Exchange Logo" style="max-width: 200px; height: auto;">
        </div>
        <div style="background-color: #1a1b2a; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #2a2a3c;">
          <h2 style="color: #fff; text-align: center; margin-bottom: 25px; font-weight: 600;">Password Updated</h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello,</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Your password for Ripple Exchange has been successfully changed.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 16px; padding: 15px 25px; background: linear-gradient(135deg, #0ECB81, #05854f); border-radius: 8px; display: inline-block; color: white; box-shadow: 0 4px 10px rgba(14, 203, 129, 0.3);">
              ✓ Password Changed Successfully
            </div>
          </div>
          
          <div style="color: #cccccc; line-height: 1.6; font-size: 16px; padding: 20px; border-radius: 8px; background-color: rgba(74, 107, 243, 0.1); margin-bottom: 20px;">
            <p style="margin: 0; margin-bottom: 10px;">
              <strong style="color: #fff;">Security Notice:</strong>
            </p>
            <ul style="margin-top: 5px; padding-left: 20px;">
              <li style="margin-bottom: 8px;">This change was made on ${new Date().toUTCString()}</li>
              <li style="margin-bottom: 8px;">If you recently changed your password, no further action is needed.</li>
              <li>If you did not make this change, please contact our security team immediately.</li>
            </ul>
          </div>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
          <p>&copy; ${new Date().getFullYear()} Ripple Exchange. All rights reserved.</p>
          <p>This is a system-generated email. Please do not reply.</p>
        </div>
      </div>
    `;
    
    // Save a copy (for debugging)
    saveEmailCopy(email, 'Password Changed', html);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Ripple Exchange" <verify.rippleexchange@gmail.com>',
      to: email,
      subject: 'Ripple Exchange: Password Changed Successfully',
      html: html
    });
    
    console.log(`Password change confirmation email sent to ${email} (MessageID: ${info.messageId})`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending password change confirmation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send 2FA status change email
const send2FAStatusChangeEmail = async (email, enabled) => {
  try {
    const transporter = createTransporter();
    
    // Email HTML template
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: #0c1021; color: #fff;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #2a2a3c;">
          <img src="https://rippleexchange.org/static/media/logo.fb82fbabcd2b7e76a491.png" alt="Ripple Exchange Logo" style="max-width: 200px; height: auto;">
        </div>
        <div style="background-color: #1a1b2a; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #2a2a3c;">
          <h2 style="color: #fff; text-align: center; margin-bottom: 25px; font-weight: 600;">Security Update</h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello,</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">This email confirms that Two-Factor Authentication (2FA) has been ${enabled ? 'enabled' : 'disabled'} on your Ripple Exchange account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 16px; padding: 15px 25px; background: ${enabled ? 'linear-gradient(135deg, #0ECB81, #05854f)' : 'linear-gradient(135deg, #F6465D, #a01b2d)'}; border-radius: 8px; display: inline-block; color: white; box-shadow: ${enabled ? '0 4px 10px rgba(14, 203, 129, 0.3)' : '0 4px 10px rgba(246, 70, 93, 0.3)'};">
              ${enabled ? '✓ 2FA ENABLED' : '✗ 2FA DISABLED'}
            </div>
          </div>
          
          <div style="color: #cccccc; line-height: 1.6; font-size: 16px; padding: 20px; border-radius: 8px; background-color: rgba(74, 107, 243, 0.1); margin-bottom: 20px;">
            <p style="margin: 0; margin-bottom: 10px;">
              <strong style="color: #fff;">${enabled ? 'Your account is now protected' : 'Security level changed'}:</strong>
            </p>
            <p style="margin: 0;">
              ${enabled 
                ? 'Your account is now protected with an additional layer of security. Two-factor authentication helps prevent unauthorized access by requiring a verification code in addition to your password.' 
                : 'Your account is now less secure without 2FA protection. We strongly recommend enabling 2FA again to protect your account from unauthorized access.'}
            </p>
          </div>
          
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">If you did not make this change, please contact our security team immediately.</p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
          <p>&copy; ${new Date().getFullYear()} Ripple Exchange. All rights reserved.</p>
          <p>This is a system-generated email. Please do not reply.</p>
        </div>
      </div>
    `;
    
    // Save a copy (for debugging)
    saveEmailCopy(email, `2FA ${enabled ? 'Enabled' : 'Disabled'}`, html);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Ripple Exchange" <verify.rippleexchange@gmail.com>',
      to: email,
      subject: `Ripple Exchange: Two-Factor Authentication ${enabled ? 'Enabled' : 'Disabled'}`,
      html: html
    });
    
    console.log(`2FA status change email sent to ${email} (MessageID: ${info.messageId})`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending 2FA status change email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add a general sendEmail function to be used by all email functions
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransporter();
    
    // Save a copy for debugging
    saveEmailCopy(to, subject, htmlContent);
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Ripple Exchange" <verify.rippleexchange@gmail.com>',
      to: to,
      subject: subject,
      html: htmlContent
    });
    
    console.log(`Email sent to ${to} (MessageID: ${info.messageId})`);
    
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test if email service is working
const testEmailService = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    
    return {
      success: true,
      message: 'SMTP connection established successfully'
    };
  } catch (error) {
    console.error('Email service test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Add a transfer notification function to the email service
const sendTransferNotification = async (recipientEmail, transferData) => {
  try {
    console.log('Sending transfer notification email to:', recipientEmail);
    
    const { amount, token, sender } = transferData;
    
    // Generate email content
    const subject = `You've received ${amount} ${token}`;
    const htmlContent = `
       <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 10px; background-color: #0c1021; color: #fff;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #2a2a3c;">
          <img src="https://rippleexchange.org/static/media/logo.fb82fbabcd2b7e76a491.png" alt="Ripple Exchange Logo" style="max-width: 200px; height: auto;">
        </div>
        <div style="background-color: #1a1b2a; padding: 30px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); border: 1px solid #2a2a3c;">
          <h2 style="color: #fff; text-align: center; margin-bottom: 25px; font-weight: 400;"><b>${amount} ${token}</b> Received from ${sender} <img src="https://cdn3d.iconscout.com/3d/premium/thumb/credit-card-3d-icon-download-in-png-blend-fbx-gltf-file-formats--payment-banking-debit-pack-business-icons-5654935.png" height=40 width=50></h2>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">Hello,</p>
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px;">You Just Recived<b> ${amount} ${token}</b> Received from ${sender}. The Transfer was Crefited Directly to your Wallet.</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px; background: linear-gradient(135deg, #4A6BF3, #2a3c82); border-radius: 8px; display: inline-block; color: #fff; box-shadow: 0 4px 10px rgba(74, 107, 243, 0.3);"><b> ${amount} ${token}</b></div>
          </div>
        
          <p style="color: #cccccc; line-height: 1.6; font-size: 16px; margin-top: 25px; background-color: rgb(60, 179, 113, 0.1); padding: 15px; border-left: 4px solid #F6465D; border-radius: 4px;">
            <strong style="color: #fff;">A friendly reminder:</strong> This is an Automated Message, Please do not reply.
            
            <br>If you need any support, Send a mail at <b>support@rippleexchange.org</b>
          </p>
        </div>
        <div style="margin-top: 30px; padding-top: 20px; color: #888; font-size: 13px; text-align: center; line-height: 1.5;">
          <p>&copy; ${new Date().getFullYear()} Ripple Exchange. All rights reserved.</p>
          <p>Stay connected</p>
        </div>
      </div>
    `;
    
    // If sendEmail is not defined, we'll create a minimal version here
    if (typeof sendEmail === 'undefined') {
      // Create a transporter
      const transporter = createTransporter();
      
      // Save a copy for debugging
      saveEmailCopy(recipientEmail, subject, htmlContent);
      
      // Send the email
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Ripple Exchange" <verify.rippleexchange@gmail.com>',
        to: recipientEmail,
        subject: subject,
        html: htmlContent
      });
      
      console.log(`Email sent to ${recipientEmail} (MessageID: ${info.messageId})`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } else {
      // Use the existing sendEmail function
      return await sendEmail(recipientEmail, subject, htmlContent);
    }
  } catch (error) {
    console.error('Error sending transfer notification email:', error);
    return { success: false, error: error.message };
  }
};

// Export the function if this is a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendPasswordChangeConfirmation,
    send2FAStatusChangeEmail,
    testEmailService,
    sendTransferNotification,
    sendEmail  // Export the new function
  };
}