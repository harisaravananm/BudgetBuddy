import emailjs from "@emailjs/browser";

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem("budgetbuddy_emailjs_config");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const stored = loadStoredConfig();

export const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || stored.serviceId || "",
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || stored.templateId || "",
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || stored.publicKey || "",
};

export function setEmailJSConfig({ serviceId, templateId, publicKey }) {
  if (serviceId) EMAILJS_CONFIG.serviceId = serviceId;
  if (templateId) EMAILJS_CONFIG.templateId = templateId;
  if (publicKey) EMAILJS_CONFIG.publicKey = publicKey;
  try {
    localStorage.setItem("budgetbuddy_emailjs_config", JSON.stringify(EMAILJS_CONFIG));
  } catch {
    // ignore storage errors
  }
}

export async function syncEmailJSConfigFromServer(fetchConfigFn) {
  if (isEmailJSConfigured()) return EMAILJS_CONFIG;
  try {
    const data = await fetchConfigFn();
    if (data && data.service_id && data.template_id && data.public_key) {
      setEmailJSConfig({
        serviceId: data.service_id,
        templateId: data.template_id,
        publicKey: data.public_key,
      });
    }
  } catch {
    // ignore if backend endpoint is unavailable
  }
  return EMAILJS_CONFIG;
}

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
    message: "Your frontend EmailJS integration is connected and transmitting alerts directly from your browser to your inbox!",
    alertType: "EmailJS Connection Test",
  });
}

/**
 * Send Budget Warning or Exceeded Alert via EmailJS
 */
export async function sendBudgetAlertEmailJS({
  toEmail,
  toName = "BudgetBuddy User",
  category = "General",
  spent = 0,
  limit = 0,
  percentage = 100,
}) {
  const isExceeded = percentage >= 100;
  const statusTitle = isExceeded
    ? `🚨 Budget Exceeded Alert: ${category}`
    : `⚠️ Budget Warning Alert: ${category}`;
  const message = isExceeded
    ? `Your spending in ${category} has reached ₹${spent} which exceeds your set limit of ₹${limit} (${percentage}% used). Please review your recent transactions.`
    : `Your spending in ${category} has reached ₹${spent} (${percentage}% of your ₹${limit} monthly limit). Consider pacing upcoming expenses.`;

  return sendEmailJSNotification({
    toEmail,
    toName,
    subject: statusTitle,
    message,
    alertType: isExceeded ? "Budget Exceeded" : "Budget Warning",
    amount: spent,
    category,
  });
}

/**
 * Send Large Expense Alert via EmailJS
 */
export async function sendLargeExpenseEmailJS({
  toEmail,
  toName = "BudgetBuddy User",
  category = "General",
  amount = 0,
  threshold = 5000,
  date = "",
  note = "",
}) {
  const message = `A high-value transaction of ₹${amount} was recorded in '${category}' on ${date || "today"}.${note ? ` Note: "${note}".` : ""} This exceeds your alert threshold of ₹${threshold}.`;

  return sendEmailJSNotification({
    toEmail,
    toName,
    subject: `💸 High Expense Notice: ₹${amount} in ${category}`,
    message,
    alertType: "Large Expense Alert",
    amount,
    category,
  });
}

/**
 * Send Savings Goal Milestone Notification via EmailJS
 */
export async function sendGoalMilestoneEmailJS({
  toEmail,
  toName = "BudgetBuddy User",
  goalName = "Savings Goal",
  currentAmount = 0,
  targetAmount = 0,
  milestone = 100,
}) {
  const isCompleted = milestone >= 100;
  const subject = isCompleted
    ? `🏆 Goal Achieved: ${goalName} Completed!`
    : `🎯 Goal Milestone: ${goalName} reached ${milestone}%!`;
  const message = isCompleted
    ? `Congratulations! You have reached your target of ₹${targetAmount} for your savings goal "${goalName}". Fantastic financial discipline!`
    : `Great progress! You have saved ₹${currentAmount} toward your ₹${targetAmount} goal for "${goalName}" (${milestone}% completed). Keep going!`;

  return sendEmailJSNotification({
    toEmail,
    toName,
    subject,
    message,
    alertType: isCompleted ? "Goal Completed" : "Goal Milestone",
    amount: currentAmount,
    category: goalName,
  });
}
