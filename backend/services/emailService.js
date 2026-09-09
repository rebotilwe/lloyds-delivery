import nodemailer from 'nodemailer';

// ── Lloyd's Delivery Email Service ──────────────────────────────────────────
// Gmail SMTP via App Password (2FA enabled on Lloydsdelivery924@gmail.com)
// App Password generated: isin kpfj bfmd llpr

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service failed to connect:', error.message);
  } else {
    console.log('✅ Email service connected — ready to send');
  }
});

const FROM = process.env.EMAIL_FROM || "Lloyd's Delivery <Lloydsdelivery924@gmail.com>";

// ── Order Confirmation ───────────────────────────────────────────────────────
export const sendOrderConfirmation = async (order, customerEmail, customerName) => {
  if (!customerEmail) return;

  const items = Array.isArray(order.items)
    ? order.items.map(i => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${i.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">R${(i.price * i.quantity).toFixed(2)}</td>
      </tr>`).join('')
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;">
      <div style="background:#1B3A5C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;">Lloyd's Delivery</h1>
        <p style="color:#5B8C6E;margin:8px 0 0;font-size:14px;">Order Confirmation</p>
      </div>
      <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:16px;">Hi <strong>${customerName || 'there'}</strong>,</p>
        <p style="color:#555;font-size:14px;">Your order has been placed successfully! Here are your order details:</p>
        <div style="background:#f5f5f5;padding:12px 16px;border-radius:6px;margin:16px 0;">
          <p style="margin:4px 0;color:#333;font-size:14px;"><strong>Order #:</strong> ${order.id}</p>
          <p style="margin:4px 0;color:#333;font-size:14px;"><strong>Restaurant:</strong> ${order.restaurant_name || 'N/A'}</p>
          <p style="margin:4px 0;color:#333;font-size:14px;"><strong>Delivery Address:</strong> ${order.delivery_address || 'N/A'}</p>
        </div>
        ${items ? `
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#1B3A5C;">
              <th style="padding:8px 12px;color:#fff;text-align:left;font-size:13px;">Item</th>
              <th style="padding:8px 12px;color:#fff;text-align:center;font-size:13px;">Qty</th>
              <th style="padding:8px 12px;color:#fff;text-align:right;font-size:13px;">Price</th>
            </tr>
          </thead>
          <tbody>${items}</tbody>
        </table>` : ''}
        <div style="text-align:right;padding:12px 0;border-top:2px solid #1B3A5C;">
          <p style="margin:4px 0;color:#555;font-size:13px;">Delivery Fee: R${parseFloat(order.delivery_fee || 0).toFixed(2)}</p>
          <p style="margin:4px 0;color:#1B3A5C;font-size:18px;font-weight:bold;">Total: R${parseFloat(order.total || 0).toFixed(2)}</p>
        </div>
        <p style="color:#555;font-size:13px;margin-top:20px;">Track your order at: <a href="https://lloyds-delivery.netlify.app/orders" style="color:#5B8C6E;">lloyds-delivery.netlify.app/orders</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">Thank you for choosing Lloyd's Delivery! 🍔</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: customerEmail,
      subject: `Order Confirmed #${order.id} — Lloyd's Delivery`,
      html,
    });
    console.log(`📧 Order confirmation sent to ${customerEmail}`);
  } catch (err) {
    console.error('❌ Failed to send order confirmation:', err.message);
  }
};

// ── Order Status Update ──────────────────────────────────────────────────────
export const sendOrderStatusUpdate = async (order, customerEmail, customerName, previousStatus, newStatus) => {
  if (!customerEmail) return;

  const statusMessages = {
    confirmed:        { emoji: '✅', title: 'Order Confirmed', msg: 'The restaurant has confirmed your order and is preparing it now.' },
    preparing:        { emoji: '👨‍🍳', title: 'Being Prepared', msg: 'Your food is being prepared fresh right now.' },
    ready_for_pickup: { emoji: '🍔', title: 'Ready for Pickup', msg: 'Your order is ready! A driver will collect it shortly.' },
    picked_up:        { emoji: '🚗', title: 'Picked Up', msg: 'A driver has collected your order and is on the way.' },
    on_the_way:       { emoji: '🚚', title: 'On the Way!', msg: 'Your driver is on the way to your address. Track them live on the app.' },
    delivered:        { emoji: '🎉', title: 'Delivered!', msg: 'Your order has been delivered. Enjoy your meal!' },
    cancelled:        { emoji: '❌', title: 'Order Cancelled', msg: 'Your order has been cancelled. Contact support if you have questions.' },
  };

  const statusInfo = statusMessages[newStatus];
  if (!statusInfo) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;">
      <div style="background:#1B3A5C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;">Lloyd's Delivery</h1>
        <p style="color:#5B8C6E;margin:8px 0 0;font-size:14px;">Order Update</p>
      </div>
      <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;">
        <div style="text-align:center;padding:20px 0;">
          <p style="font-size:48px;margin:0;">${statusInfo.emoji}</p>
          <h2 style="color:#1B3A5C;margin:8px 0;">${statusInfo.title}</h2>
        </div>
        <p style="color:#333;font-size:15px;">Hi <strong>${customerName || 'there'}</strong>,</p>
        <p style="color:#555;font-size:14px;">${statusInfo.msg}</p>
        <div style="background:#f5f5f5;padding:12px 16px;border-radius:6px;margin:16px 0;">
          <p style="margin:4px 0;color:#333;font-size:14px;"><strong>Order #:</strong> ${order.id}</p>
          <p style="margin:4px 0;color:#333;font-size:14px;"><strong>Total:</strong> R${parseFloat(order.total || 0).toFixed(2)}</p>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="https://lloyds-delivery.netlify.app/orders" 
             style="background:#1B3A5C;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">
            Track Your Order
          </a>
        </div>
        <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">Lloyd's Delivery — Fast. Reliable. Always on time.</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: customerEmail,
      subject: `${statusInfo.emoji} Order #${order.id} — ${statusInfo.title}`,
      html,
    });
    console.log(`📧 Status update (${newStatus}) sent to ${customerEmail}`);
  } catch (err) {
    console.error('❌ Failed to send status update:', err.message);
  }
};

// ── Password Reset ───────────────────────────────────────────────────────────
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  const resetUrl = `https://lloyds-delivery.netlify.app/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;">
      <div style="background:#1B3A5C;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;">Lloyd's Delivery</h1>
        <p style="color:#5B8C6E;margin:8px 0 0;font-size:14px;">Password Reset</p>
      </div>
      <div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;">
        <p style="color:#333;font-size:15px;">Hi <strong>${userName || 'there'}</strong>,</p>
        <p style="color:#555;font-size:14px;">We received a request to reset your password. Click the button below to reset it:</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${resetUrl}" 
             style="background:#5B8C6E;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;">
            Reset My Password
          </a>
        </div>
        <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request a password reset, ignore this email — your account is safe.</p>
        <p style="color:#aaa;font-size:12px;word-break:break-all;">Or copy this link: ${resetUrl}</p>
        <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">Lloyd's Delivery — Fast. Reliable. Always on time.</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: "Reset Your Lloyd's Delivery Password",
      html,
    });
    console.log(`📧 Password reset email sent to ${email}`);
  } catch (err) {
    console.error('❌ Failed to send password reset email:', err.message);
  }
};