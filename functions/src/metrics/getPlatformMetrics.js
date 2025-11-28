const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const getPlatformMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can access platform metrics
  await assertSuperAdmin(context.auth.uid);

  try {
    // Get all users
    const usersSnapshot = await admin.firestore().collection("users").get();
    
    let totalUsers = 0;
    let totalLawyers = 0;
    let verifiedLawyers = 0;
    let pendingVerifications = 0;
    
    let totalWalletBalance = 0;
    let totalPlatformEarnings = 0;
    
    let totalCases = 0;
    let casesInProgress = 0;
    let closedCases = 0;
    
    let totalConsultations = 0;
    let totalCallsToday = 0;
    let totalChatSessionsToday = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      totalUsers++;
      
      if (userData.role === "lawyer") {
        totalLawyers++;
        
        if (userData.verificationStatus === "verified") {
          verifiedLawyers++;
        } else if (userData.verificationStatus === "pending") {
          pendingVerifications++;
        }
        
        // Lawyer metrics
        totalCases += userData.totalCasesHandled || 0;
        totalConsultations += userData.totalConsultationsCompleted || 0;
        totalPlatformEarnings += userData.totalEarnings || 0;
      } else if (userData.role === "user") {
        // User metrics
        totalWalletBalance += userData.walletBalance || 0;
        totalConsultations += userData.totalConsultationsDone || 0;
      }
    });
    
    // Get cases collection if it exists
    try {
      const casesSnapshot = await admin.firestore().collection("cases").get();
      casesSnapshot.forEach(doc => {
        const caseData = doc.data();
        totalCases++;
        
        if (caseData.status === "in-progress") {
          casesInProgress++;
        } else if (caseData.status === "completed" || caseData.status === "closed") {
          closedCases++;
        }
      });
    } catch (error) {
      // Cases collection might not exist yet
      console.log("Cases collection not found or inaccessible");
    }
    
    // Get today's calls and chats if collections exist
    try {
      const startOfDay = admin.firestore.Timestamp.fromDate(today);
      const endOfDay = admin.firestore.Timestamp.fromDate(new Date(today.getTime() + 24 * 60 * 60 * 1000));
      
      // Count today's calls (this is a simplified example - you might have a specific calls collection)
      // const callsSnapshot = await admin.firestore()
      //   .collection("calls")
      //   .where("timestamp", ">=", startOfDay)
      //   .where("timestamp", "<", endOfDay)
      //   .get();
      // totalCallsToday = callsSnapshot.size;
      
      // Count today's chat sessions (this is a simplified example - you might have a specific chats collection)
      // const chatsSnapshot = await admin.firestore()
      //   .collection("chats")
      //   .where("timestamp", ">=", startOfDay)
      //   .where("timestamp", "<", endOfDay)
      //   .get();
      // totalChatSessionsToday = chatsSnapshot.size;
    } catch (error) {
      // Calls or chats collections might not exist yet
      console.log("Calls or chats collections not found or inaccessible");
    }
    
    return {
      success: true,
      metrics: {
        totalUsers: totalUsers,
        totalLawyers: totalLawyers,
        verifiedLawyers: verifiedLawyers,
        pendingVerifications: pendingVerifications,
        totalWalletBalance: totalWalletBalance,
        totalPlatformEarnings: totalPlatformEarnings,
        totalCases: totalCases,
        casesInProgress: casesInProgress,
        closedCases: closedCases,
        totalConsultations: totalConsultations,
        totalCallsToday: totalCallsToday,
        totalChatSessionsToday: totalChatSessionsToday
      }
    };
  } catch (error) {
    console.error("Error getting platform metrics:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get platform metrics");
  }
});

module.exports = {getPlatformMetrics};