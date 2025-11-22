const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const processWithdrawal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can process withdrawals
  await assertSuperAdmin(context.auth.uid);

  const {withdrawalId, status, transactionId, processingNotes} = data;
  
  // Validate required fields
  if (!withdrawalId || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Withdrawal ID and status are required");
  }

  // Validate status
  const validStatuses = ["approved", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status. Must be 'approved' or 'rejected'");
  }

  try {
    // Get withdrawal request
    const withdrawalRef = admin.firestore().collection("withdrawals").doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();
    
    if (!withdrawalDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Withdrawal request not found");
    }
    
    const withdrawalData = withdrawalDoc.data();
    
    // Check if already processed
    if (withdrawalData.status !== "pending") {
      throw new functions.https.HttpsError("failed-precondition", "Withdrawal request already processed");
    }
    
    // Update withdrawal status
    const updateData = {
      status: status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      processedBy: context.auth.uid
    };
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    if (processingNotes) {
      updateData.processingNotes = processingNotes;
    }
    
    await withdrawalRef.update(updateData);
    
    // If approved, deduct from lawyer's wallet
    if (status === "approved") {
      const userId = withdrawalData.userId;
      
      // Deduct amount from user's wallet
      await admin.firestore().collection("users").doc(userId).update({
        walletBalance: admin.firestore.FieldValue.increment(-withdrawalData.amount),
        totalEarnings: admin.firestore.FieldValue.increment(-withdrawalData.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create transaction record
      const transaction = {
        id: admin.firestore().collection("users").doc(userId).collection("transactions").doc().id,
        amount: withdrawalData.amount,
        type: "debit",
        description: `Withdrawal processed - ${transactionId || withdrawalId}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        balanceBefore: 0, // This would need to be fetched in a real implementation
        balanceAfter: 0   // This would need to be fetched in a real implementation
      };
      
      // Add transaction to user's transaction history
      await admin.firestore().collection("users").doc(userId).collection("transactions").doc(transaction.id).set(transaction);
    }
    
    return {
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawalId: withdrawalId,
      status: status
    };
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to process withdrawal");
  }
});

module.exports = {processWithdrawal};