import emailjs from "@emailjs/browser";

export const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "",
};

export function isEmailJSConfigured() {
  return Boolean(
    EMAILJS_CONFIG.serviceId &&
    EMAILJS_CONFIG.templateId &&
    EMAILJS_CONFIG.publicKey
  );
}

/**
 * Dispatch an email notification directly via EmailJS.
 * EmailJS template variables: app_name, to_name, to_email, reply_to, subject,
 * message, notification_title, notification_message, alert_type, amount,
 * category, timestamp, app_url.
 */
export async function sendEmailJSNotification({
  toEmail,
  toName = "BudgetBuddy User",
  subject = "BudgetBuddy Alert",
  message = "",
  alertType = "Notification",
  amount = "",
  category = "",
}) {
  if (!isEmailJSConfigured()) {
    throw new Error(
      "EmailJS credentials missing. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your frontend/.env file."
    );
  }

  const templateParams = {
    app_name: "BudgetBuddy",
    to_email: toEmail,
    to_name: toName,
    reply_to: toEmail,
    subject: subject,
    message: message,
    notification_title: subject,
    notification_message: message,
    alert_type: alertType,
    amount: amount ? `₹${amount}` : "N/A",
    category: category || "General",
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    app_url: window.location.origin,
  };

  const response = await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    templateParams,
    EMAILJS_CONFIG.publicKey
  );

  return response;
}

/**
 * Test dispatch helper for EmailJS in SettingsTab
 */
export async function testEmailJSConnection(recipientEmail, userName = "Student") {
  return sendEmailJSNotification({
    toEmail: recipientEmail,
    toName: userName,
    subject: "✅ BudgetBuddy: EmailJS Client Notification Test",
    message: "Your frontend EmailJS integration is connected and transmitting alerts directly from the browser!",
    alertType: "EmailJS Connection Test",
  });
}
