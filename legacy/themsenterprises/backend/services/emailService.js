const nodemailer = require('nodemailer');

/**
 * Helper function to extract and format customizations properly
 * @param {Object} customisation - The customisation object
 * @param {Boolean} isAdmin - Whether this is for admin email (shows download buttons)
 */
const formatCustomizations = (customisation, isAdmin = false) => {
  if (!customisation || !customisation.dynamicCustomizations) {
    return '';
  }

  const dynamicCustomizations = customisation.dynamicCustomizations;
  const customizationItems = [];

  Object.entries(dynamicCustomizations).forEach(([key, customizationData]) => {
    const name = customizationData.name || key;
    const value = customizationData.value;

    // Handle different types of customizations
    if (typeof value === 'object' && value !== null) {
      // This is an image upload customization
      if (value.url) {
        customizationItems.push(`
          <div style="margin: 10px 0; padding: 12px; background: #fff; border: 1px solid #e0e0e0; border-radius: 6px;">
            <div style="font-weight: 600; color: #333; margin-bottom: 8px; font-size: 14px;">
              📎 ${name}
            </div>
            <div style="text-align: center; margin: 10px 0;">
              <img src="${value.url}" alt="${value.name || 'Uploaded image'}" 
                   style="max-width: 100%; max-height: 300px; border: 2px solid #e0e0e0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 8px;">
              📄 ${value.name || 'Custom upload'}
            </div>
            ${isAdmin ? `
              <div style="margin-top: 12px;">
                <a href="${value.url}" download="${value.name || 'customization-image.png'}" 
                   style="display: inline-block; background: #4CAF50; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 13px; font-weight: 500;">
                  ⬇️ Download Image
                </a>
              </div>
            ` : ''}
          </div>
        `);
      } else {
        // Object without URL - stringify it
        customizationItems.push(`
          <div style="margin: 8px 0; padding: 10px; background: #fff; border-left: 3px solid #2196F3; border-radius: 4px;">
            <strong style="color: #333; font-size: 14px;">${name}:</strong> 
            <span style="color: #666; font-size: 13px;">${JSON.stringify(value)}</span>
          </div>
        `);
      }
    } else {
      // Simple text/select value
      customizationItems.push(`
        <div style="margin: 8px 0; padding: 10px; background: #fff; border-left: 3px solid #2196F3; border-radius: 4px;">
          <strong style="color: #333; font-size: 14px;">${name}:</strong> 
          <span style="color: #666; font-size: 13px;">${value}</span>
        </div>
      `);
    }
  });

  return customizationItems.length > 0 
    ? `<div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-top: 12px; border: 1px solid #e0e0e0;">${customizationItems.join('')}</div>` 
    : '';
};

// Create transporter using Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST,
  port: process.env.BREVO_PORT,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});

// Email templates
const emailTemplates = {
  orderConfirmation: (orderData) => ({
    subject: `✅ Order Confirmed #${orderData.orderId.slice(-8)} - MS Enterprises & Jaksh`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            background-color: #f5f5f5;
          }
          .email-wrapper { 
            background-color: #f5f5f5; 
            padding: 20px 0; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 { 
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p { 
            margin: 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .success-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            margin-top: 15px;
            font-size: 14px;
          }
          .content { 
            padding: 30px;
            background: #fafafa;
          }
          .greeting {
            background: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #f44336;
          }
          .greeting h2 {
            color: #d32f2f;
            margin-bottom: 10px;
            font-size: 20px;
          }
          .greeting p {
            color: #666;
            font-size: 15px;
            line-height: 1.6;
          }
          .order-details { 
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .order-details h3 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f5f5f5;
            font-size: 18px;
          }
          .product { 
            border-bottom: 1px solid #f0f0f0;
            padding: 20px 0;
            display: table;
            width: 100%;
          }
          .product:last-child { 
            border-bottom: none;
          }
          .product-image-wrapper {
            display: table-cell;
            width: 120px;
            vertical-align: top;
            padding-right: 20px;
          }
          .product-image { 
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #f0f0f0;
          }
          .product-info { 
            display: table-cell;
            vertical-align: top;
          }
          .product-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
          }
          .product-brand {
            font-size: 13px;
            color: #999;
            margin-bottom: 10px;
          }
          .product-details {
            font-size: 14px;
            color: #666;
            line-height: 1.8;
          }
          .total { 
            font-weight: 700;
            font-size: 20px;
            color: #d32f2f;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            text-align: right;
          }
          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-box p {
            margin: 5px 0;
            font-size: 14px;
            color: #1976D2;
          }
          .contact-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .contact-box h4 {
            color: #333;
            margin-bottom: 12px;
            font-size: 16px;
          }
          .contact-box ul {
            list-style: none;
            padding: 0;
          }
          .contact-box li {
            padding: 8px 0;
            color: #666;
            font-size: 14px;
          }
          .footer { 
            background: #263238;
            color: #b0bec5;
            text-align: center;
            padding: 30px;
          }
          .footer p {
            margin: 8px 0;
            font-size: 13px;
          }
          .footer strong {
            color: #eceff1;
            font-size: 14px;
          }
          @media only screen and (max-width: 600px) {
            .container { 
              margin: 10px;
              border-radius: 8px;
            }
            .header { 
              padding: 30px 20px;
            }
            .header h1 {
              font-size: 24px;
            }
            .content { 
              padding: 20px;
            }
            .product {
              display: block;
            }
            .product-image-wrapper {
              display: block;
              width: 100%;
              text-align: center;
              margin-bottom: 15px;
              padding-right: 0;
            }
            .product-info {
              display: block;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <h1>✅ Order Confirmed!</h1>
              <p>Thank you for choosing MS Enterprises & Jaksh</p>
              <div class="success-badge">
                Order #${orderData.orderId.slice(-8).toUpperCase()}
              </div>
            </div>

            <div class="content">
              <div class="greeting">
                <h2>Hello ${orderData.customerName}! 👋</h2>
                <p>Great news! Your order has been confirmed and is now being processed. We're working hard to get it to you as soon as possible.</p>
              </div>

              <div class="info-box">
                <p><strong>📦 What's Next?</strong></p>
                <p>We'll send you another email with tracking information once your order ships.</p>
              </div>

              <div class="order-details">
                <h3>📋 Order Summary</h3>
                ${orderData.products.map(product => `
                  <div class="product">
                    ${product.imageUrl ? `
                      <div class="product-image-wrapper">
                        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
                      </div>
                    ` : ''}
                    <div class="product-info">
                      <div class="product-name">${product.name}</div>
                      ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
                      <div class="product-details">
                        <strong>Quantity:</strong> ${product.quantity}<br>
                        <strong>Price:</strong> ₹${product.price}
                      </div>
                      ${product.customization ? product.customization : ''}
                    </div>
                  </div>
                `).join('')}

                <div class="total">
                  Total Amount: ₹${orderData.totalAmount}
                </div>
              </div>

              <div class="order-details">
                <h3>🚚 Shipping Address</h3>
                <p style="line-height: 1.8; color: #666;">
                  <strong style="color: #333;">${orderData.shippingAddress.name}</strong><br>
                  ${orderData.shippingAddress.street}<br>
                  ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.pincode}<br>
                  📞 ${orderData.shippingAddress.phone}
                </p>
              </div>

              <div class="contact-box">
                <h4>💬 Need Help?</h4>
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Our customer support team is here for you!</p>
                <ul>
                  <li>📞 <strong>Phone:</strong> +91 9034283036, +91 9467283036, +91 9812000488</li>
                  <li>📧 <strong>Email:</strong> support@themsenterprises.com</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p><strong>MS Enterprises & Jaksh</strong></p>
              <p>Quality Products Since 2009</p>
              <p>108/25, Mohan Nagar, Sonipat, Haryana, 131001</p>
              <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #37474f;">
                © ${new Date().getFullYear()} MS Enterprises & Jaksh. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  adminOrderNotification: (orderData) => ({
    subject: `🔔 New Order #${orderData.orderId.slice(-8)} - ₹${orderData.totalAmount}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Notification</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            background-color: #f5f5f5;
          }
          .email-wrapper { 
            background-color: #f5f5f5; 
            padding: 20px 0; 
          }
          .container { 
            max-width: 650px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1976D2 0%, #2196F3 100%);
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 { 
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p { 
            margin: 0;
            font-size: 16px;
            opacity: 0.95;
          }
          .order-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            margin-top: 15px;
            font-size: 16px;
            font-weight: 600;
          }
          .content { 
            padding: 30px;
            background: #fafafa;
          }
          .alert-box {
            background: linear-gradient(135deg, #ff6f00 0%, #ff8f00 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
          }
          .alert-box strong {
            font-size: 16px;
            display: block;
            margin-bottom: 5px;
          }
          .alert-box p {
            margin: 0;
            font-size: 14px;
            opacity: 0.95;
          }
          .info-grid {
            display: table;
            width: 100%;
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }
          .info-row {
            display: table-row;
          }
          .info-label {
            display: table-cell;
            padding: 10px;
            font-weight: 600;
            color: #555;
            width: 40%;
          }
          .info-value {
            display: table-cell;
            padding: 10px;
            color: #333;
          }
          .order-details { 
            background: white;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          .order-details h3 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f5f5f5;
            font-size: 18px;
          }
          .product { 
            border: 1px solid #f0f0f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            background: #fafafa;
            display: table;
            width: 100%;
          }
          .product-image-wrapper {
            display: table-cell;
            width: 120px;
            vertical-align: top;
            padding-right: 20px;
          }
          .product-image { 
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 8px;
            border: 2px solid #e0e0e0;
          }
          .product-info { 
            display: table-cell;
            vertical-align: top;
          }
          .product-name {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
          }
          .product-brand {
            font-size: 13px;
            color: #999;
            margin-bottom: 10px;
          }
          .product-details {
            font-size: 14px;
            color: #666;
            line-height: 1.8;
          }
          .total { 
            font-weight: 700;
            font-size: 22px;
            color: #1976D2;
            margin-top: 20px;
            padding: 20px;
            background: #e3f2fd;
            border-radius: 8px;
            text-align: center;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-completed {
            background: #c8e6c9;
            color: #2e7d32;
          }
          .status-pending {
            background: #fff9c4;
            color: #f57f17;
          }
          .footer { 
            background: #263238;
            color: #b0bec5;
            text-align: center;
            padding: 30px;
          }
          .footer p {
            margin: 8px 0;
            font-size: 13px;
          }
          @media only screen and (max-width: 600px) {
            .container { 
              margin: 10px;
            }
            .content { 
              padding: 20px;
            }
            .product {
              display: block;
            }
            .product-image-wrapper {
              display: block;
              width: 100%;
              text-align: center;
              margin-bottom: 15px;
              padding-right: 0;
            }
            .product-info {
              display: block;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <h1>🔔 New Order Received!</h1>
              <p>A customer has placed a new order</p>
              <div class="order-badge">
                #${orderData.orderId.slice(-8).toUpperCase()}
              </div>
            </div>

            <div class="content">
              <div class="alert-box">
                <strong>⚡ Action Required</strong>
                <p>Please process this order and update the fulfillment status</p>
              </div>

              <div class="order-details">
                <h3>👤 Customer Information</h3>
                <div class="info-grid">
                  <div class="info-row">
                    <div class="info-label">Name:</div>
                    <div class="info-value"><strong>${orderData.customerName}</strong></div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">${orderData.customerEmail}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Phone:</div>
                    <div class="info-value">${orderData.customerPhone || orderData.shippingAddress.phone}</div>
                  </div>
                </div>
              </div>

              <div class="order-details">
                <h3>🛍️ Order Items</h3>
                ${orderData.products.map(product => `
                  <div class="product">
                    ${product.imageUrl ? `
                      <div class="product-image-wrapper">
                        <img src="${product.imageUrl}" alt="${product.name}" class="product-image">
                      </div>
                    ` : ''}
                    <div class="product-info">
                      <div class="product-name">${product.name}</div>
                      ${product.brand ? `<div class="product-brand">${product.brand}</div>` : ''}
                      <div class="product-details">
                        <strong>Quantity:</strong> ${product.quantity}<br>
                        <strong>Price:</strong> ₹${product.price}
                      </div>
                      ${product.customization ? product.customization : ''}
                    </div>
                  </div>
                `).join('')}

                <div class="total">
                  💰 Total Amount: ₹${orderData.totalAmount}
                </div>
              </div>

              <div class="order-details">
                <h3>🚚 Shipping Details</h3>
                <p style="line-height: 1.8; color: #666;">
                  <strong style="color: #333;">${orderData.shippingAddress.name}</strong><br>
                  ${orderData.shippingAddress.street}<br>
                  ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.pincode}<br>
                  📞 ${orderData.shippingAddress.phone}
                </p>
              </div>

              <div class="order-details">
                <h3>💳 Payment Information</h3>
                <div class="info-grid">
                  <div class="info-row">
                    <div class="info-label">Payment ID:</div>
                    <div class="info-value"><code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">${orderData.paymentId}</code></div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Payment Status:</div>
                    <div class="info-value">
                      <span class="status-badge ${orderData.paymentStatus === 'completed' ? 'status-completed' : 'status-pending'}">
                        ${orderData.paymentStatus}
                      </span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-label">Order Status:</div>
                    <div class="info-value">
                      <span class="status-badge status-pending">${orderData.orderStatus}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>MS Enterprises & Jaksh - Admin Dashboard</strong></p>
              <p>Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
              <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #37474f;">
                © ${new Date().getFullYear()} MS Enterprises & Jaksh. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  paymentFailed: (data) => ({
    subject: `❌ Payment Failed - Order #${data.orderId.slice(-8)}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333;
            background-color: #f5f5f5;
          }
          .email-wrapper { 
            background-color: #f5f5f5; 
            padding: 20px 0; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #c62828 0%, #e53935 100%);
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 { 
            margin: 0 0 10px 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            padding: 30px;
            background: #fafafa;
          }
          .greeting {
            background: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #e53935;
          }
          .error-box { 
            background: #ffebee;
            border: 2px solid #ef5350;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .error-box strong {
            color: #c62828;
            display: block;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .error-box p {
            color: #d32f2f;
            margin: 0;
          }
          .retry-btn { 
            display: inline-block;
            background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
            color: white !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 6px rgba(211, 47, 47, 0.3);
          }
          .info-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .info-box h4 {
            color: #333;
            margin-bottom: 12px;
          }
          .info-box ul {
            list-style: none;
            padding: 0;
          }
          .info-box li {
            padding: 8px 0;
            color: #666;
          }
          .footer { 
            background: #263238;
            color: #b0bec5;
            text-align: center;
            padding: 30px;
          }
          .footer p {
            margin: 8px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <h1>❌ Payment Failed</h1>
              <p>We couldn't process your payment</p>
            </div>

            <div class="content">
              <div class="greeting">
                <h2 style="color: #d32f2f; margin-bottom: 10px;">Dear ${data.customerName},</h2>
                <p style="color: #666;">We're sorry, but your payment for Order #${data.orderId.slice(-8).toUpperCase()} could not be processed.</p>
              </div>

              <div class="error-box">
                <strong>⚠️ Reason:</strong>
                <p>${data.reason}</p>
              </div>

              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;"><strong>Good News!</strong> Your order is still reserved for the next 24 hours.</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/orders/${data.orderId}" class="retry-btn">
                  🔄 Retry Payment
                </a>
              </div>

              <div class="info-box">
                <h4>💬 Need Help?</h4>
                <p style="color: #666; margin-bottom: 10px;">If you continue to experience issues, please contact our support team:</p>
                <ul>
                  <li>📞 <strong>Phone:</strong> +91 9034283036, +91 9467283036</li>
                  <li>📧 <strong>Email:</strong> info@themsenterprises.com</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p><strong>MS Enterprises & Jaksh</strong></p>
              <p>Quality Products Since 2009</p>
              <p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #37474f;">
                © ${new Date().getFullYear()} MS Enterprises & Jaksh. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// Send email function
const sendEmail = async (to, template, data) => {
  try {
    const emailContent = emailTemplates[template](data);

    const mailOptions = {
      from: '"MS Enterprises & Jaksh" <info@themsenterprises.com>',
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      replyTo: "info@themsenterprises.com"
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Specific email functions
const sendOrderConfirmation = async (customerEmail, orderData) => {
  return await sendEmail(customerEmail, 'orderConfirmation', orderData);
};

const sendAdminOrderNotification = async (adminEmail, orderData) => {
  return await sendEmail(adminEmail, 'adminOrderNotification', orderData);
};

const sendPaymentFailedEmail = async (customerEmail, data) => {
  return await sendEmail(customerEmail, 'paymentFailed', data);
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendAdminOrderNotification,
  sendPaymentFailedEmail,
  emailTemplates,
  formatCustomizations
};