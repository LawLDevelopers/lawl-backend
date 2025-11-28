const {admin, functions} = require("../utils/firebase");
const Razorpay = require('razorpay');

// Initialize Razorpay with your credentials
let razorpay;
try {
  const key_id = functions.config().razorpay?.key_id;
  const key_secret = functions.config().razorpay?.key_secret;
  
  if (key_id && key_secret) {
    razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
  } else {
    console.warn("Razorpay credentials not configured. Payments will not work.");
    razorpay = null;
  }
} catch (error) {
  console.warn("Error initializing Razorpay:", error.message);
  razorpay = null;
}

const validateAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if Razorpay is properly configured
  if (!razorpay) {
    throw new functions.https.HttpsError("failed-precondition", "Payment system not configured");
  }

  const {accountId} = data;
  
  // Validate required fields
  if (!accountId) {
    throw new functions.https.HttpsError("invalid-argument", "Account ID is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify user is admin
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Only admins can validate accounts");
    }
    
    // Validate account with Razorpay
    const account = await razorpay.accounts.fetch(accountId);
    
    return {
      success: true,
      id: account.id,
      status: account.status,
      name: account.legal_business_name || account.customer_name,
      ifsc: account.notes?.ifsc || null,
      account_number: account.notes?.account_number ? 
        "*".repeat(account.notes.account_number.length - 4) + 
        account.notes.account_number.slice(-4) : null
    };
  } catch (error) {
    console.error("Error validating account:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to validate account");
  }
});

module.exports = {validateAccount};