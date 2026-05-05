// lib/notify.ts
// Sends email + WhatsApp to the owner when a tenant submits payment proof.
// Uses Resend for email and Twilio for WhatsApp.
// Fill in your real credentials in .env.local

const OWNER_EMAIL    = process.env.OWNER_EMAIL    || 'owner@yourdomain.com';
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || '+254757662968'; // your WhatsApp number with country code
const APP_URL        = process.env.NEXTAUTH_URL   || 'https://saas-woad-nine.vercel.app';

// ── Email via Resend ──────────────────────────────────────────────────────────
export async function sendOwnerEmail({
  subject, html,
}: { subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('[Notify] RESEND_API_KEY not set — skipping email'); return; }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    process.env.RESEND_FROM || 'SafariOps <noreply@yourdomain.com>',
      to:      [OWNER_EMAIL],
      subject,
      html,
    }),
  });
}

// ── WhatsApp via Twilio ───────────────────────────────────────────────────────
export async function sendOwnerWhatsApp(message: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number

  if (!sid || !token) { console.warn('[Notify] Twilio credentials not set — skipping WhatsApp'); return; }

  const body = new URLSearchParams({
    From: from,
    To:   `whatsapp:${OWNER_WHATSAPP}`,
    Body: message,
  });

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
}

// ── Combined notification ─────────────────────────────────────────────────────
export async function notifyOwnerPaymentSubmitted({
  tenantId, tenantName, tenantEmail, planName, amount, method, reference,
}: {
  tenantId:   string;
  tenantName: string;
  tenantEmail:string;
  planName:   string;
  amount:     string;
  method:     string;
  reference:  string;
}) {
  const approveUrl = `${APP_URL}/api/admin/approve?tenantId=${tenantId}&action=approve&token=${process.env.ADMIN_SECRET_TOKEN}`;
  const rejectUrl  = `${APP_URL}/api/admin/approve?tenantId=${tenantId}&action=reject&token=${process.env.ADMIN_SECRET_TOKEN}`;
  const dashboardUrl = `${APP_URL}/admin`;

  // Email
  await sendOwnerEmail({
    subject: `💳 New payment submitted — ${tenantName} (${planName})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e">New Payment Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#666;border-bottom:1px solid #eee">Company</td><td style="padding:8px;font-weight:600;border-bottom:1px solid #eee">${tenantName}</td></tr>
          <tr><td style="padding:8px;color:#666;border-bottom:1px solid #eee">Email</td><td style="padding:8px;border-bottom:1px solid #eee">${tenantEmail}</td></tr>
          <tr><td style="padding:8px;color:#666;border-bottom:1px solid #eee">Plan</td><td style="padding:8px;font-weight:600;border-bottom:1px solid #eee">${planName}</td></tr>
          <tr><td style="padding:8px;color:#666;border-bottom:1px solid #eee">Amount</td><td style="padding:8px;border-bottom:1px solid #eee">${amount}</td></tr>
          <tr><td style="padding:8px;color:#666;border-bottom:1px solid #eee">Method</td><td style="padding:8px;border-bottom:1px solid #eee">${method}</td></tr>
          <tr><td style="padding:8px;color:#666">Reference/Code</td><td style="padding:8px;font-weight:600">${reference}</td></tr>
        </table>
        <p style="color:#555;margin:16px 0">Please verify this payment and approve or reject below:</p>
        <div style="margin:24px 0;display:flex;gap:12px">
          <a href="${approveUrl}" style="background:#22c55e;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-right:12px">✅ Approve</a>
          <a href="${rejectUrl}"  style="background:#ef4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">❌ Reject</a>
        </div>
        <p style="color:#999;font-size:12px">Or manage all tenants at <a href="${dashboardUrl}">${dashboardUrl}</a></p>
      </div>
    `,
  });

  // WhatsApp
  await sendOwnerWhatsApp(
    `💳 *New Payment — ${tenantName}*\n` +
    `Plan: ${planName}\n` +
    `Amount: ${amount}\n` +
    `Method: ${method}\n` +
    `Ref: ${reference}\n\n` +
    `✅ Approve: ${approveUrl}\n` +
    `❌ Reject: ${rejectUrl}`
  );
}

// ── Notify tenant that their account was approved ─────────────────────────────
export async function notifyTenantApproved({
  tenantEmail, tenantName, planName,
}: { tenantEmail: string; tenantName: string; planName: string }) {
  await sendOwnerEmail({
    subject: `✅ Your ${planName} plan is now active — Welcome to SafariOps!`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#22c55e">Your account is now active! 🎉</h2>
        <p>Hi ${tenantName},</p>
        <p>Your payment has been verified and your <strong>${planName}</strong> plan is now active.</p>
        <p>You can now log in and access all features:</p>
        <a href="${APP_URL}/login" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin:16px 0">Go to Dashboard →</a>
        <p style="color:#999;font-size:12px;margin-top:24px">If you have any questions, reply to this email.</p>
      </div>
    `,
  });
}

// ── Notify tenant that their payment was rejected ─────────────────────────────
export async function notifyTenantRejected({
  tenantEmail, tenantName,
}: { tenantEmail: string; tenantName: string }) {
  await sendOwnerEmail({
    subject: `Payment not verified — SafariOps`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#ef4444">Payment could not be verified</h2>
        <p>Hi ${tenantName},</p>
        <p>We were unable to verify your payment. This may be due to an incorrect reference number or amount.</p>
        <p>Please <a href="${APP_URL}/billing">try again</a> or contact us for assistance.</p>
      </div>
    `,
  });
}
