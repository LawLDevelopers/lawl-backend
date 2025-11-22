const {admin, functions} = require("../utils/firebase");

const deductCallCost = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {callId, duration} = data;
  
  // Validate required fields
  if (!callId || duration === undefined) {
    throw new functions.https.HttpsError("invalid-argument", "Call ID and duration are required");
  }

  // Validate duration
  if (typeof duration !== "number" || duration < 0) {
    throw new functions.https.HttpsError("invalid-argument", "Duration must be a non-negative number");
  }

  try {
    const userId = context.auth.uid;
    
    // Get the call document
    const callRef = admin.firestore().collection("calls").doc(callId);
    const callDoc = await callRef.get();
    
    if (!callDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Call not found");
    }
    
    const callData = callDoc.data();
    
    // Verify that the user is the caller
    if (callData.userId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only the caller can deduct call costs");
    }
    
    // Calculate cost based on duration and rate
    const ratePerMinute = callData.rate || 0;
    const cost = (duration / 60) * ratePerMinute;
    
    // Get user's current wallet balance
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;
    
    // Check if sufficient balance
    if (currentBalance < cost) {
      // Update call status to insufficient balance
      await callRef.update({
        status: "insufficient_balance",
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
        duration: duration,
        cost: cost
      });
      
      throw new functions.https.HttpsError("failed-precondition", "Insufficient wallet balance");
    }
    
    // Deduct cost from wallet
    const newBalance = currentBalance - cost;
    
    // Create transaction record
    const transaction = {
      id: admin.firestore().collection("users").doc(userId).collection("transactions").doc().id,
      amount: cost,
      type: "debit",
      description: `${callData.callType.charAt(0).toUpperCase() + callData.callType.slice(1)} call with ${callData.lawyerId}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    };
    
    // Update wallet balance and add transaction
    await admin.firestore().runTransaction(async (transactionDb) => {
      // Update user's wallet balance
      transactionDb.update(
        admin.firestore().collection("users").doc(userId),
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
      
      // Update call document with cost and end time
      transactionDb.update(
        callRef,
        {
          status: "completed",
          endedAt: admin.firestore.FieldValue.serverTimestamp(),
          duration: duration,
          cost: cost
        }
      );
      
      // Update lawyer's earnings
      transactionDb.update(
        admin.firestore().collection("users").doc(callData.lawyerId),
        {
          totalEarnings: admin.firestore.FieldValue.increment(cost),
          walletBalance: admin.firestore.FieldValue.increment(cost),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      );
    });
    
    return {
      success: true,
      message: "Call cost deducted successfully",
      newBalance: newBalance,
      cost: cost,
      transaction: transaction
    };
  } catch (error) {
    console.error("Error deducting call cost:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to deduct call cost");
  }
});

module.exports = {deductCallCost};