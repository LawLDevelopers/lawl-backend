const {admin, functions} = require("../utils/firebase");
const crypto = require('crypto');

const verifyPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {razorpay_order_id, razorpay_payment_id, razorpay_signature} = data;
  
  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new functions.https.HttpsError("invalid-argument", "All Razorpay payment details are required");
  }

  try {
    const userId = context.auth.uid;
    
    // Get secret from config with error handling
    let secret;
    try {
      secret = functions.config().razorpay?.key_secret;
      if (!secret) {
        throw new functions.https.HttpsError("failed-precondition", "Payment system not properly configured");
      }
    } catch (configError) {
      throw new functions.https.HttpsError("failed-precondition", "Payment system not properly configured");
    }
    
    // Verify payment signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid payment signature");
    }
    
    // Update payment status in Firestore
    const paymentRef = admin.firestore().collection("payments").doc(razorpay_order_id);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Payment order not found");
    }
    
    const paymentData = paymentDoc.data();
    
    // Verify the payment belongs to the user
    if (paymentData.userId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Payment does not belong to this user");
    }
    
    // Update payment status
    await paymentRef.update({
      status: 'completed',
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user's wallet balance
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;
    const rechargeAmount = paymentData.amount;
    const newBalance = currentBalance + rechargeAmount;
    
    // Create transaction record
    const transaction = {
      id: admin.firestore().collection("users").doc(userId).collection("transactions").doc().id,
      amount: rechargeAmount,
      type: "credit",
      description: `Wallet recharge via Razorpay order ${razorpay_order_id}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    };
    
    // Update wallet balance and add transaction
    await admin.firestore().runTransaction(async (transactionDb) => {
      // Update user's wallet balance
      transactionDb.update(
        userRef,
        {
          walletBalance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      );
      
      // Add transaction to user's transaction history
      transactionDb.set(
        admin.firestore().collection("users").doc(userId).collection("transactions").doc(transaction.id),
        transaction
      );
    });
    
    return {
      success: true,
      message: "Payment verified and wallet updated successfully",
      newBalance: newBalance,
      transaction: transaction
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to verify payment");
  }
});

module.exports = {verifyPayment};