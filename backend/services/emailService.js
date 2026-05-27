import nodemailer from 'nodemailer';

// Configure email transporter
let transporter = null;

// Initialize transporter function - ALWAYS USE ETHEREAL FOR TESTING
export const initEmailTransporter = async () => {
  try {
    // Always use Ethereal for testing - no real SMTP needed
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
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email transporter verified and ready');
    
    return transporter;
  } catch (error) {
    console.error('❌ Failed to create Ethereal account:', error.message);
    // Create a mock transporter that logs instead of sending
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('📧 MOCK EMAIL (would send):');
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log(`   Preview would be at: https://ethereal.email`);
        return { messageId: 'mock-' + Date.now() };
      }
    };
    return transporter;
  }
};

// Send order confirmation email
export const sendOrderConfirmation = async (order, customerEmail, customerName) => {
  if (!transporter) {
    console.log('Email transporter not initialized, initializing now...');
    await initEmailTransporter();
  }
  
  if (!transporter) {
    console.log('❌ Email transporter not available, skipping email');
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
    console.log(`📧 Order confirmation email prepared for ${customerEmail}`);
    console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`   ⚠️  Copy this URL and open in browser to view the email`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.log(`📧 Would have sent order confirmation to: ${customerEmail}`);
    return null;
  }
};

// Send order status update email
export const sendOrderStatusUpdate = async (order, customerEmail, customerName, oldStatus, newStatus) => {
  if (!transporter) {
    await initEmailTransporter();
  }
  
  if (!transporter) {
    console.log('❌ Email transporter not available');
    return;
  }

  const statusMessages = {
    confirmed: 'has been confirmed and is being prepared',
    ready_for_pickup: 'is ready for pickup by the driver',
    picked_up: 'has been picked up by the driver',
    on_the_way: 'is on the way to you! 🚚',
    delivered: 'has been delivered. Enjoy your meal! 🍕',
    cancelled: 'has been cancelled',
  };

  const mailOptions = {
    from: '"Lloyd\'s Delivery" <noreply@lloydsdelivery.co.za>',
    to: customerEmail,
    subject: `📦 Order #${order.id} Status Update - ${newStatus?.replace(/_/g, ' ').toUpperCase()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a2c3e;">Order #${order.id} Status Update</h2>
        <p>Dear <strong>${customerName || 'Customer'}</strong>,</p>
        <p>Your order ${statusMessages[newStatus] || `has been updated to ${newStatus}`}</p>
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Current Status:</strong> ${newStatus?.replace(/_/g, ' ').toUpperCase()}</p>
        </div>
        <hr />
        <p style="font-size: 12px; color: #999;">Lloyd's Delivery</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Status update email prepared for ${customerEmail}: ${oldStatus} → ${newStatus}`);
    console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return null;
  }
};

// Send refund email
export const sendRefundEmail = async (order, rejectionReason) => {
  if (!transporter) {
    await initEmailTransporter();
  }
  
  if (!transporter) {
    console.log('❌ Email transporter not available');
    return;
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

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Refund email prepared for ${order.customer_email}`);
    console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error('Error sending refund email:', error.message);
    return null;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, name, resetLink) => {
  if (!transporter) {
    await initEmailTransporter();
  }
  
  if (!transporter) {
    console.log('❌ Email transporter not available');
    return;
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

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email prepared for ${email}`);
    console.log(`   📎 PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    return null;
  }
};