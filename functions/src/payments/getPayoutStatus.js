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

const getPayoutStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if Razorpay is properly configured
  if (!razorpay) {
    throw new functions.https.HttpsError("failed-precondition", "Payment system not configured");
  }

  const {payoutId} = data;
  
  // Validate required fields
  if (!payoutId) {
    throw new functions.https.HttpsError("invalid-argument", "Payout ID is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify user is admin or the owner of the payout
    const payoutDoc = await admin.firestore().collection("payouts").doc(payoutId).get();
    
    if (!payoutDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Payout not found");
    }
    
    const payoutData = payoutDoc.data();
    
    // Check permissions
    if (payoutData.userId !== userId && payoutData.role !== "admin") {
      // If not admin or owner, check if user is associated with this payout
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      
      if (userData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Not authorized to view this payout");
      }
    }
    
    // Get payout status from Razorpay
    const payout = await razorpay.transfers.fetch(payoutId);
    
    // Update payout status in Firestore
    await admin.firestore().collection("payouts").doc(payoutId).update({
      status: payout.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      payoutId: payout.id,
      status: payout.status
    };
  } catch (error) {
    console.error("Error getting payout status:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get payout status");
  }
});

module.exports = {getPayoutStatus};