import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import * as nodemailer from 'nodemailer';

export const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');

const FROM_ADDRESS = '"Wishlist Wizard" <support@wishlist-wizard.com>';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: 'support@wishlist-wizard.com',
      pass: gmailAppPassword.value(),
    },
  });
}

interface EmailData {
  to: string;
  subject: string;
  template: 'price-tracking-welcome' | 'price-alert';
  data: Record<string, string>;
}

function renderTemplate(template: EmailData['template'], data: Record<string, string>): string {
  const base = (title: string, body: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#4f46e5;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Wishlist Wizard</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${body}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
            <p style="margin:0;color:#9ca3af;font-size:13px;">
              You're receiving this because you have an account at
              <a href="https://wishlist-wizard.com" style="color:#4f46e5;text-decoration:none;">wishlist-wizard.com</a>.
              To manage your notification preferences, visit your
              <a href="https://wishlist-wizard.com/app/settings" style="color:#4f46e5;text-decoration:none;">account settings</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (template === 'price-tracking-welcome') {
    return base('Price Tracking Active', `
      <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:600;">Price tracking is active, ${data.displayName}!</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
        We're now watching the price of <strong>${data.productTitle}</strong> for you.
        You'll get an email the moment it drops to your target price.
      </p>
      <a href="${data.productUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
        View Product
      </a>
      <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
        You can manage all your price alerts from your
        <a href="https://wishlist-wizard.com/app/dashboard" style="color:#4f46e5;text-decoration:none;">dashboard</a>.
      </p>`);
  }

  // price-alert
  const priceBlock = data.oldPrice && data.newPrice ? `
    <table cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin:20px 0;width:100%;">
      <tr>
        <td style="color:#6b7280;font-size:13px;padding-bottom:4px;">Was</td>
        <td style="color:#6b7280;font-size:13px;padding-bottom:4px;text-align:right;">Now</td>
      </tr>
      <tr>
        <td style="color:#9ca3af;font-size:20px;font-weight:600;text-decoration:line-through;">${data.oldPrice}</td>
        <td style="color:#16a34a;font-size:24px;font-weight:700;text-align:right;">${data.newPrice}</td>
      </tr>
    </table>` : '';

  return base(data.title, `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:600;">${data.title}</p>
    <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">Hi ${data.displayName}, ${data.body}</p>
    ${priceBlock}
    <a href="${data.productUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
      View ${data.productTitle}
    </a>`);
}

export async function sendEmail(data: EmailData): Promise<void> {
  const html = renderTemplate(data.template, data.data);
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM_ADDRESS,
    to: data.to,
    subject: data.subject,
    html,
  });
  logger.info('Email sent', { to: data.to, subject: data.subject, template: data.template });
}
