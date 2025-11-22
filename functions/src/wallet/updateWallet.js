const {admin, functions} = require("../utils/firebase");

const updateWallet = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {amount, transactionType, description} = data;
  
  // Validate required fields
  if (amount === undefined || !transactionType) {
    throw new functions.https.HttpsError("invalid-argument", "Amount and transaction type are required");
  }

  // Validate transaction type
  const validTypes = ["credit", "debit", "refund"];
  if (!validTypes.includes(transactionType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid transaction type");
  }

  // Validate amount
  if (typeof amount !== "number" || isNaN(amount)) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a valid number");
  }

  try {
    const uid = context.auth.uid;
    
    // Get current user data
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    const currentBalance = userData.walletBalance || 0;
    
    // Calculate new balance
    let newBalance;
    if (transactionType === "credit" || transactionType === "refund") {
      newBalance = currentBalance + amount;
    } else if (transactionType === "debit") {
      newBalance = currentBalance - amount;
      // Check if sufficient balance
      if (newBalance < 0) {
        throw new functions.https.HttpsError("failed-precondition", "Insufficient wallet balance");
      }
    }
    
    // Create transaction record
    const transaction = {
      id: admin.firestore().collection("users").doc(uid).collection("transactions").doc().id,
      amount: amount,
      type: transactionType,
      description: description || `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      balanceBefore: currentBalance,
      balanceAfter: newBalance
    };
    
    // Update wallet balance and add transaction
    await admin.firestore().runTransaction(async (transactionDb) => {
      // Update user's wallet balance
      transactionDb.update(
        admin.firestore().collection("users").doc(uid),
        {
          walletBalance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      );
      
      // Add transaction to user's transaction history
      transactionDb.set(
        admin.firestore().collection("users").doc(uid).collection("transactions").doc(transaction.id),
        transaction
      );
    });
    
    return {
      success: true,
      message: "Wallet updated successfully",
      newBalance: newBalance,
      transaction: transaction
    };
  } catch (error) {
    console.error("Error updating wallet:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update wallet");
  }
});

module.exports = {updateWallet};