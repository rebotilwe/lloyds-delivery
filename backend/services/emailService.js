import nodemailer from 'nodemailer';

// Configure email transporter
let transporter = null;
let emailInitAttempted = false;

// Initialize transporter function with better timeout handling
export const initEmailTransporter = async () => {
  if (emailInitAttempted && transporter) {
    return transporter;
  }
  
  emailInitAttempted = true;
  
  try {
    console.log('📧 Setting up Ethereal email account...');
    
    // Create Ethereal account with timeout
    const testAccount = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ethereal connection timeout')), 10000)
      )
    ]);
    
    console.log('📧 Ethereal email account created:');
    console.log(`   Email: ${testAccount.user}`);
    console.log(`   Password: ${testAccount.pass}`);
    console.log(`   Preview URL: https://ethereal.email/messages`);
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    
    // Verify connection with timeout
    await Promise.race([
      transporter.verify(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP verification timeout')), 10000)
      )
    ]);
    
    console.log('✅ Email transporter verified and ready');
    return transporter;
    
  } catch (error) {
    console.error('❌ Failed to create Ethereal account:', error.message);
    
    // Create a mock transporter that logs emails instead of sending
    console.log('📧 Falling back to mock email mode - emails will be logged to console');
    
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n' + '='.repeat(60));
        console.log('📧 MOCK EMAIL (would send):');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log(`   Preview: Check Render logs for email content`);
        console.log('='.repeat(60) + '\n');
        
        // Also log the email content for debugging
        console.log('Email HTML content preview:');
        console.log(mailOptions.html?.substring(0, 500) + '...');
        
        return { messageId: 'mock-' + Date.now() };
      }
    };
    
    return transporter;
  }
};

// Send package rejection email to customer
export const sendPackageRejectionEmail = async (order, rejectionReason) => {
  try {
    if (!transporter) {
      await initEmailTransporter();
    }
    
    if (!transporter) {
      console.log('❌ Email transporter not available, skipping email');
      return null;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://lloyds-delivery.netlify.app';
    const supportEmail = 'support@lloydsdelivery.com';
    const supportPhone = '+27 00 000 0000';
    const rejectionDate = new Date().toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOptions = {
      from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
      to: order.customer_email,
      subject: `❌ Package Delivery Request Rejected - #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; }
            .header { background-color: #dc2626; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 20px; }
            .order-details { background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .rejection-reason { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
            .next-steps { background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .button-secondary { display: inline-block; padding: 12px 24px; background-color: #6b7280; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; margin-left: 10px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Package Delivery Request Rejected</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${order.customer_name || 'Customer'}</strong>,</p>
              <p>We regret to inform you that your package delivery request <strong>#${order.id}</strong> has been reviewed and <strong style="color: #dc2626;">REJECTED</strong>.</p>
              
              <div class="order-details">
                <h3>📦 Order Details</h3>
                <p><strong>Order ID:</strong> ${order.id}</p>
                <p><strong>Pickup Address:</strong> ${order.pickup_address || 'Not specified'}</p>
                <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
                <p><strong>Package Weight:</strong> ${order.package_weight || 0} kg</p>
                <p><strong>Request Date:</strong> ${rejectionDate}</p>
              </div>
              
              <div class="rejection-reason">
                <h3>❌ Rejection Reason</h3>
                <p>${rejectionReason}</p>
              </div>
              
              <div class="next-steps">
                <h3>📋 What You Can Do Next</h3>
                <ul>
                  <li><strong>Contact Support:</strong> Reply to this email or call us for clarification</li>
                  <li><strong>Submit New Request:</strong> Create a new package delivery with corrected information</li>
                  <li><strong>Review Guidelines:</strong> Check our delivery policies on the website</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${frontendUrl}/package-delivery" class="button">Submit New Request</a>
                <a href="${frontendUrl}/support" class="button-secondary">Contact Support</a>
              </div>
              
              <div style="margin-top: 20px; text-align: center;">
                <p>Need help? Contact us:</p>
                <p>📧 <a href="mailto:${supportEmail}">${supportEmail}</a> | 📞 ${supportPhone}</p>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Lloyd's Delivery. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Package rejection email sent to ${order.customer_email} for order #${order.id}`);
    
    if (info.messageId && !info.messageId.startsWith('mock')) {
      console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending package rejection email:', error.message);
    return null;
  }
};

// Send order confirmation email
export const sendOrderConfirmation = async (order, customerEmail, customerName) => {
  try {
    if (!transporter) {
      await initEmailTransporter();
    }
    
    if (!transporter) {
      console.log('❌ Email transporter not available, skipping email');
      return null;
    }

    const items = order.items || [];
    const frontendUrl = process.env.FRONTEND_URL || 'https://lloyds-delivery.netlify.app';
    
    const mailOptions = {
      from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
      to: customerEmail,
      subject: `✅ Order Confirmed! #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 10px; }
            .header { background-color: #1a2c3e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: #2ecc71; margin: 0; }
            .content { padding: 30px; }
            .order-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .total { font-size: 18px; font-weight: bold; color: #2ecc71; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍔 Lloyd's Delivery</h1>
              <p style="color: white;">Your order has been confirmed!</p>
            </div>
            <div class="content">
              <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
              <p>Thank you for your order! We've received your order #${order.id} and it's being prepared.</p>
              
              <div class="order-details">
                <h3>Order Summary</h3>
                <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
                <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
                
                <h4>Items:</h4>
                ${items.map(item => `
                  <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>R${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                `).join('')}
                
                <div style="border-top: 2px solid #2ecc71; margin-top: 10px; padding-top: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span><strong>Total:</strong></span>
                    <span class="total">R${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <p>You can track your order in real-time.</p>
            </div>
            <div class="footer">
              <p>Lloyd's Delivery - Fast, reliable food delivery</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Order confirmation email prepared for ${customerEmail}`);
    
    if (info.messageId && !info.messageId.startsWith('mock')) {
      console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending order confirmation email:', error.message);
    return null;
  }
};

// Send order status update email
export const sendOrderStatusUpdate = async (order, customerEmail, customerName, oldStatus, newStatus) => {
  try {
    if (!transporter) {
      await initEmailTransporter();
    }
    
    if (!transporter) {
      console.log('❌ Email transporter not available');
      return null;
    }

    const statusMessages = {
      confirmed: 'has been confirmed and is being prepared',
      ready_for_pickup: 'is ready for pickup by the driver',
      picked_up: 'has been picked up by the driver',
      on_the_way: 'is on the way to you! 🚚',
      delivered: 'has been delivered. Enjoy your meal! 🍕',
      cancelled: 'has been cancelled',
      rejected: 'has been rejected by the restaurant',
    };

    const statusColors = {
      confirmed: '#3498db',
      ready_for_pickup: '#f39c12',
      picked_up: '#e67e22',
      on_the_way: '#9b59b6',
      delivered: '#2ecc71',
      cancelled: '#e74c3c',
      rejected: '#e74c3c',
    };

    const mailOptions = {
      from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
      to: customerEmail,
      subject: `📦 Order #${order.id} Status Update`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a2c3e;">Order #${order.id} Status Update</h2>
          <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
          <div style="background-color: ${statusColors[newStatus] || '#f0fdf4'}; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Status:</strong> ${newStatus?.replace(/_/g, ' ').toUpperCase()}</p>
            <p style="margin: 5px 0 0;">Your order ${statusMessages[newStatus] || `has been updated to ${newStatus}`}</p>
          </div>
          <hr />
          <p style="font-size: 12px; color: #999;">Lloyd's Delivery</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Status update email prepared for ${customerEmail}: ${oldStatus} → ${newStatus}`);
    
    if (info.messageId && !info.messageId.startsWith('mock')) {
      console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending status update email:', error.message);
    return null;
  }
};

// Send refund email
export const sendRefundEmail = async (order, rejectionReason) => {
  try {
    if (!transporter) {
      await initEmailTransporter();
    }
    
    if (!transporter) {
      console.log('❌ Email transporter not available');
      return null;
    }

    const mailOptions = {
      from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
      to: order.customer_email,
      subject: `💰 Refund Processed for Order #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a2c3e;">Refund Processed</h2>
          <p>Dear <strong>${order.customer_name || 'Customer'}</strong>,</p>
          <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #dc2626;"><strong>Order Rejected</strong></p>
            <p>Reason: ${rejectionReason || 'No specific reason provided'}</p>
          </div>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Refund Amount:</strong> R${Number(order.total).toFixed(2)}</p>
            <p style="margin: 5px 0 0; font-size: 12px;">Refund will reflect in 3-5 business days</p>
          </div>
          <hr />
          <p style="font-size: 12px; color: #999;">Lloyd's Delivery</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Refund email prepared for ${order.customer_email}`);
    
    if (info.messageId && !info.messageId.startsWith('mock')) {
      console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending refund email:', error.message);
    return null;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, resetLink) => {
  try {
    if (!transporter) {
      await initEmailTransporter();
    }
    
    if (!transporter) {
      console.log('❌ Email transporter not available');
      return null;
    }

    const mailOptions = {
      from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
      to: email,
      subject: '🔐 Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a2c3e;">Password Reset Request</h2>
          <p>Dear <strong>${name || 'Customer'}</strong>,</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <hr />
          <p style="font-size: 12px; color: #999;">Lloyd's Delivery</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email prepared for ${email}`);
    
    if (info.messageId && !info.messageId.startsWith('mock')) {
      console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    return null;
  }
};