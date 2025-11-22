const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const getPendingWithdrawals = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can access pending withdrawals
  await assertSuperAdmin(context.auth.uid);

  const {limit = 50} = data;

  try {
    // Get pending withdrawal requests
    const query = admin.firestore()
      .collection("withdrawals")
      .where("status", "==", "pending")
      .orderBy("requestedAt", "desc")
      .limit(limit);
    
    const withdrawalsSnapshot = await query.get();
    
    const pendingWithdrawals = [];
    withdrawalsSnapshot.forEach(doc => {
      pendingWithdrawals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get user details for each withdrawal
    const withdrawsWithUserDetails = [];
    for (const withdrawal of pendingWithdrawals) {
      const userDoc = await admin.firestore().collection("users").doc(withdrawal.userId).get();
      const userData = userDoc.data();
      
      withdrawsWithUserDetails.push({
        ...withdrawal,
        user: {
          name: userData?.name || "",
          email: userData?.email || "",
          phoneNumber: userData?.phoneNumber || ""
        }
      });
    }
    
    return {
      success: true,
      withdrawals: withdrawsWithUserDetails,
      count: withdrawsWithUserDetails.length
    };
  } catch (error) {
    console.error("Error getting pending withdrawals:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get pending withdrawals");
  }
});

module.exports = {getPendingWithdrawals};