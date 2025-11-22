const {admin, functions} = require("../utils/firebase");

const getWithdrawalHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {limit = 50, orderBy = "requestedAt", orderDirection = "desc"} = data;

  try {
    const userId = context.auth.uid;
    
    // Verify user is a lawyer
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== "lawyer") {
      throw new functions.https.HttpsError("permission-denied", "Only lawyers can access withdrawal history");
    }
    
    // Get user's withdrawal requests
    let query = admin.firestore()
      .collection("withdrawals")
      .where("userId", "==", userId)
      .orderBy(orderBy, orderDirection)
      .limit(limit);
    
    const withdrawalsSnapshot = await query.get();
    
    const withdrawals = [];
    withdrawalsSnapshot.forEach(doc => {
      withdrawals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      withdrawals: withdrawals,
      count: withdrawals.length
    };
  } catch (error) {
    console.error("Error getting withdrawal history:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get withdrawal history");
  }
});

module.exports = {getWithdrawalHistory};