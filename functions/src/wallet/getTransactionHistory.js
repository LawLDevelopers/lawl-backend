const {admin, functions} = require("../utils/firebase");

const getTransactionHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {limit = 50, orderBy = "timestamp", orderDirection = "desc"} = data;

  try {
    const userId = context.auth.uid;
    
    // Get user's transactions
    let query = admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("transactions")
      .orderBy(orderBy, orderDirection)
      .limit(limit);
    
    const transactionsSnapshot = await query.get();
    
    const transactions = [];
    transactionsSnapshot.forEach(doc => {
      transactions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      success: true,
      transactions: transactions,
      count: transactions.length
    };
  } catch (error) {
    console.error("Error getting transaction history:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get transaction history");
  }
});

module.exports = {getTransactionHistory};