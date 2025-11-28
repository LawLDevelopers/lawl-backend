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

const createPayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if Razorpay is properly configured
  if (!razorpay) {
    throw new functions.https.HttpsError("failed-precondition", "Payment system not configured");
  }

  const {accountId, amount, transferId} = data;
  
  // Validate required fields
  if (!accountId || !amount || !transferId) {
    throw new functions.https.HttpsError("invalid-argument", "Account ID, amount, and transfer ID are required");
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number");
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
      throw new functions.https.HttpsError("permission-denied", "Only admins can create payouts");
    }
    
    // Create payout options
    const options = {
      account: accountId,
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      mode: 'IMPS',
      purpose: 'payout',
      transfer_id: transferId,
      queue_if_low_balance: false
    };
    
    // Create payout in Razorpay
    const payout = await razorpay.transfers.create(options);
    
    // Store payout details in Firestore
    const payoutData = {
      payoutId: payout.id,
      accountId: accountId,
      amount: amount,
      status: payout.status,
      transferId: transferId,
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection("payouts").doc(payout.id).set(payoutData);
    
    return {
      success: true,
      message: "Payout created successfully",
      payoutId: payout.id,
      amount: payout.amount,
      status: payout.status,
      transfers: payout.transfers || []
    };
  } catch (error) {
    console.error("Error creating Razorpay payout:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create payout");
  }
});

module.exports = {createPayout};