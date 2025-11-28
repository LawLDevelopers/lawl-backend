const {admin, functions} = require("../../utils/firebase");
const {assertSuperAdmin} = require("../../utils/roleUtils");

const getAdminDashboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can access admin dashboard
  await assertSuperAdmin(context.auth.uid);

  try {
    // Get total users count
    const usersSnapshot = await admin.firestore().collection("users").get();
    
    let totalUsers = 0;
    let totalLawyers = 0;
    let verifiedLawyers = 0;
    let pendingVerifications = 0;
    let rejectedLawyers = 0;
    
    let totalPlatformEarnings = 0;
    let totalWalletBalance = 0;
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      totalUsers++;
      
      if (userData.role === "lawyer") {
        totalLawyers++;
        
        if (userData.verificationStatus === "verified") {
          verifiedLawyers++;
        } else if (userData.verificationStatus === "pending") {
          pendingVerifications++;
        } else if (userData.verificationStatus === "rejected") {
          rejectedLawyers++;
        }
        
        totalPlatformEarnings += userData.totalEarnings || 0;
      } else if (userData.role === "user") {
        totalWalletBalance += userData.walletBalance || 0;
      }
    });
    
    // Get total cases
    const casesSnapshot = await admin.firestore().collection("cases").get();
    const totalCases = casesSnapshot.size;
    
    // Get recent cases
    const recentCasesQuery = admin.firestore()
      .collection("cases")
      .orderBy("createdAt", "desc")
      .limit(10);
    
    const recentCasesSnapshot = await recentCasesQuery.get();
    
    const recentCases = [];
    recentCasesSnapshot.forEach(doc => {
      const caseData = doc.data();
      recentCases.push({
        id: doc.id,
        title: caseData.title,
        userId: caseData.userId,
        lawyerId: caseData.lawyerId,
        status: caseData.status,
        createdAt: caseData.createdAt
      });
    });
    
    // Get pending KYC submissions count
    const pendingKycQuery = admin.firestore()
      .collection("kyc_submissions")
      .where("status", "==", "pending");
    
    const pendingKycSnapshot = await pendingKycQuery.get();
    const pendingKycCount = pendingKycSnapshot.size;
    
    // Get pending withdrawal requests count
    const pendingWithdrawalsQuery = admin.firestore()
      .collection("withdrawals")
      .where("status", "==", "pending");
    
    const pendingWithdrawalsSnapshot = await pendingWithdrawalsQuery.get();
    const pendingWithdrawalsCount = pendingWithdrawalsSnapshot.size;
    
    // Prepare dashboard data
    const dashboardData = {
      userMetrics: {
        totalUsers: totalUsers,
        totalLawyers: totalLawyers,
        verifiedLawyers: verifiedLawyers,
        pendingVerifications: pendingVerifications,
        rejectedLawyers: rejectedLawyers
      },
      financialMetrics: {
        totalPlatformEarnings: totalPlatformEarnings,
        totalWalletBalance: totalWalletBalance,
        pendingWithdrawals: pendingWithdrawalsCount
      },
      caseMetrics: {
        totalCases: totalCases
      },
      kycMetrics: {
        pendingKycSubmissions: pendingKycCount
      },
      recentCases: recentCases
    };
    
    return {
      success: true,
      dashboard: dashboardData
    };
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get admin dashboard");
  }
});

module.exports = {getAdminDashboard};