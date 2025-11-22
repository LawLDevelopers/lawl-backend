const {admin, functions} = require("../utils/firebase");

const requestWithdrawal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {amount, bankDetails} = data;
  
  // Validate required fields
  if (!amount || !bankDetails) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and bank details are required");
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify user is a lawyer
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== "lawyer") {
      throw new functions.https.HttpsError("permission-denied", "Only lawyers can request withdrawals");
    }
    
    // Check if sufficient balance
    const currentBalance = userData.walletBalance || 0;
    if (currentBalance < amount) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient wallet balance");
    }
    
    // Validate bank details
    if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.accountHolderName) {
      throw new functions.https.HttpsError("invalid-argument", "Complete bank details are required");
    }
    
    // Create withdrawal request
    const withdrawalData = {
      userId: userId,
      amount: amount,
      bankDetails: {
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode,
        accountHolderName: bankDetails.accountHolderName,
        bankName: bankDetails.bankName || null
      },
      status: "pending",
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
      transactionId: null
    };
    
    // Add withdrawal request to Firestore
    const withdrawalRef = await admin.firestore().collection("withdrawals").add(withdrawalData);
    
    return {
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawalId: withdrawalRef.id
    };
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to request withdrawal");
  }
});

module.exports = {requestWithdrawal};