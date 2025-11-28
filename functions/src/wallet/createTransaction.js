const {admin, functions} = require("../utils/firebase");

const createTransaction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {amount, type, description, lawyerId, sessionId} = data;
  
  // Validate required fields
  if (amount === undefined || !type || !description) {
    throw new functions.https.HttpsError("invalid-argument", "Amount, type, and description are required");
  }

  // Validate transaction type
  const validTypes = ["credit", "debit"];
  if (!validTypes.includes(type)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid transaction type. Must be 'credit' or 'debit'");
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number");
  }

  try {
    const userId = context.auth.uid;
    
    // Get current user data
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;
    
    // For debit transactions, check if sufficient balance
    if (type === "debit" && currentBalance < amount) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient wallet balance");
    }
    
    // Calculate new balance
    const newBalance = type === "credit" ? currentBalance + amount : currentBalance - amount;
    
    // Create transaction document with proper structure
    const transaction = {
      id: admin.firestore().collection("users").doc(userId).collection("transactions").doc().id,
      userId: userId,
      lawyerId: lawyerId || null,
      amount: amount,
      type: type,
      status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      sessionId: sessionId || null,
      description: description,
      failureReason: null,
      razorpayPaymentId: data.razorpayPaymentId || null
    };
    
    // Update user's wallet balance
    await admin.firestore().collection("users").doc(userId).update({
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Add transaction to user's transaction history
    await admin.firestore().collection("users").doc(userId).collection("transactions").doc(transaction.id).set(transaction);
    
    return {
      success: true,
      message: "Transaction created successfully",
      transactionId: transaction.id,
      newBalance: newBalance
    };
  } catch (error) {
    console.error("Error creating transaction:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create transaction");
  }
});

module.exports = {createTransaction};