import nodemailer from 'nodemailer';

// Configure email transporter
let transporter = null;

// Initialize transporter function
export const initEmailTransporter = async () => {
  // For development/testing - use ethereal.email
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
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
    });
  } else {
    // Production - use real SMTP
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  return transporter;
};

// Send order confirmation email
export const sendOrderConfirmation = async (order, customerEmail, customerName) => {
  if (!transporter) {
    console.log('Email transporter not initialized, skipping email');
    return;
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
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background-color: #1a2c3e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: #2ecc71; margin: 0; font-size: 24px; }
          .header p { color: #ffffff; margin: 5px 0 0; }
          .content { padding: 30px; }
          .order-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .order-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #2ecc71; }
          .status { display: inline-block; padding: 5px 15px; background-color: #2ecc71; color: white; border-radius: 20px; font-size: 12px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
          .button { background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Lloyd's Delivery</h1>
            <p>Your order has been confirmed!</p>
          </div>
          <div class="content">
            <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
            <p>Thank you for your order! We've received your order and it's being prepared.</p>
            
            <div class="order-details">
              <h3 style="margin-top: 0;">Order #${order.id}</h3>
              <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
              <p><strong>Delivery Address:</strong> ${order.delivery_address}</p>
              <p><strong>Status:</strong> <span class="status">PENDING</span></p>
              
              <h4>Order Items:</h4>
              ${items.map(item => `
                <div class="order-item">
                  <span>${item.quantity}x ${item.name}</span>
                  <span>R${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
              
              <div class="total">
                <div style="display: flex; justify-content: space-between;">
                  <span>Total Amount:</span>
                  <span style="color: #2ecc71;">R${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <p>You can track your order status in real-time:</p>
            <a href="${frontendUrl}/orders" class="button">Track Your Order</a>
          </div>
          <div class="footer">
            <p>Lloyd's Delivery - Fast, reliable food delivery at your fingertips.</p>
            <p>Questions? Contact us at support@lloydsdelivery.co.za</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Order confirmation email sent to ${customerEmail}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Send order status update email
export const sendOrderStatusUpdate = async (order, customerEmail, customerName, oldStatus, newStatus) => {
  if (!transporter) {
    console.log('Email transporter not initialized, skipping email');
    return;
  }

  const statusMessages = {
    confirmed: 'has been confirmed and is being prepared by the restaurant',
    ready_for_pickup: 'is ready for pickup by the driver',
    picked_up: 'has been picked up by the driver',
    on_the_way: 'is on the way to you! 🚚',
    delivered: 'has been delivered. Enjoy your meal! 🍕',
    cancelled: 'has been cancelled',
  };

  const statusColors = {
    confirmed: '#3498db',
    ready_for_pickup: '#f39c12',
    picked_up: '#e67e22',
    on_the_way: '#9b59b6',
    delivered: '#2ecc71',
    cancelled: '#e74c3c',
  };

  const frontendUrl = process.env.FRONTEND_URL || 'https://lloyds-delivery.netlify.app';

  const mailOptions = {
    from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
    to: customerEmail,
    subject: `📦 Order #${order.id} Status Update - ${newStatus?.replace(/_/g, ' ').toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background-color: #1a2c3e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: #2ecc71; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .status-box { background-color: ${statusColors[newStatus] || '#2ecc71'}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .status-box h2 { margin: 0; font-size: 24px; }
          .order-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
          .button { background-color: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Lloyd's Delivery</h1>
            <p>Order Status Update</p>
          </div>
          <div class="content">
            <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
            
            <div class="status-box">
              <h2>${newStatus?.replace(/_/g, ' ').toUpperCase()}</h2>
              <p>Your order ${statusMessages[newStatus] || `has been updated to ${newStatus}`}</p>
            </div>
            
            <div class="order-details">
              <h3 style="margin-top: 0;">Order #${order.id}</h3>
              <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
              <p><strong>Total:</strong> R${Number(order.total).toFixed(2)}</p>
            </div>
            
            <p>Track your order live:</p>
            <a href="${frontendUrl}/orders" class="button">Track Your Order</a>
          </div>
          <div class="footer">
            <p>Lloyd's Delivery - Fast, reliable food delivery at your fingertips.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Status update email sent to ${customerEmail}: ${oldStatus} → ${newStatus}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, resetLink) => {
  if (!transporter) {
    console.log('Email transporter not initialized, skipping email');
    return;
  }

  const mailOptions = {
    from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
    to: email,
    subject: '🔐 Reset Your Lloyd\'s Delivery Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { background-color: #1a2c3e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: #2ecc71; margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .warning-box { background-color: #fff3cd; border: 1px solid #ffecb5; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { background-color: #2ecc71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍔 Lloyd's Delivery</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Dear <strong>${name || 'Customer'}</strong>,</p>
            <p>We received a request to reset your password for your Lloyd's Delivery account.</p>
            
            <div class="warning-box">
              <p style="margin: 0; color: #856404;">⚠️ If you didn't request this, you can safely ignore this email.</p>
            </div>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset My Password</a>
            </div>
            
            <p>Or copy this link into your browser:</p>
            <p style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
              ${resetLink}
            </p>
            
            <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <hr style="margin: 20px 0; border-color: #eee;" />
            
            <p style="font-size: 12px; color: #999;">
              Lloyd's Delivery - Fast, reliable food delivery at your fingertips.<br>
              Questions? Contact us at support@lloydsdelivery.co.za
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Lloyd's Delivery. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email sent to ${email}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};
