const {admin, functions} = require("../../utils/firebase");

const getUserDashboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const userId = context.auth.uid;
    
    // Get user data
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    // Get user's active cases
    const activeCasesQuery = admin.firestore()
      .collection("cases")
      .where("userId", "==", userId)
      .where("status", "in", ["not_started", "in-progress"])
      .orderBy("createdAt", "desc")
      .limit(5);
    
    const activeCasesSnapshot = await activeCasesQuery.get();
    
    const activeCases = [];
    activeCasesSnapshot.forEach(doc => {
      const caseData = doc.data();
      activeCases.push({
        id: doc.id,
        title: caseData.title,
        lawyerId: caseData.lawyerId,
        status: caseData.status,
        percentageCompleted: caseData.percentageCompleted,
        createdAt: caseData.createdAt
      });
    });
    
    // Get user's recent chats
    const chatsQuery = admin.firestore()
      .collection("chats")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(5);
    
    const chatsSnapshot = await chatsQuery.get();
    
    const recentChats = [];
    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();
      recentChats.push({
        id: doc.id,
        lawyerId: chatData.lawyerId,
        status: chatData.status,
        updatedAt: chatData.updatedAt
      });
    });
    
    // Get user's recent calls
    const callsQuery = admin.firestore()
      .collection("calls")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5);
    
    const callsSnapshot = await callsQuery.get();
    
    const recentCalls = [];
    callsSnapshot.forEach(doc => {
      const callData = doc.data();
      recentCalls.push({
        id: doc.id,
        lawyerId: callData.lawyerId,
        callType: callData.callType,
        status: callData.status,
        duration: callData.duration,
        cost: callData.cost,
        createdAt: callData.createdAt
      });
    });
    
    // Get user's favorite lawyers
    const favoriteLawyers = [];
    if (userData.favoriteLawyers && userData.favoriteLawyers.length > 0) {
      const favoriteLawyersQuery = admin.firestore()
        .collection("users")
        .where("role", "==", "lawyer")
        .where("verificationStatus", "==", "verified")
        .where(admin.firestore.FieldPath.documentId(), "in", userData.favoriteLawyers.slice(0, 5));
      
      const favoriteLawyersSnapshot = await favoriteLawyersQuery.get();
      
      favoriteLawyersSnapshot.forEach(doc => {
        const lawyerData = doc.data();
        favoriteLawyers.push({
          id: doc.id,
          name: lawyerData.name,
          specialization: lawyerData.specialization,
          practicingCity: lawyerData.practicingCity,
          rating: lawyerData.rating,
          photo: lawyerData.photo
        });
      });
    }
    
    // Prepare dashboard data
    const dashboardData = {
      profile: {
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        photo: userData.photo
      },
      metrics: {
        walletBalance: userData.walletBalance || 0,
        totalConsultationsDone: userData.totalConsultationsDone || 0,
        totalMoneySpent: userData.totalMoneySpent || 0
      },
      activeCases: activeCases,
      recentChats: recentChats,
      recentCalls: recentCalls,
      favoriteLawyers: favoriteLawyers
    };
    
    return {
      success: true,
      dashboard: dashboardData
    };
  } catch (error) {
    console.error("Error getting user dashboard:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get user dashboard");
  }
});

module.exports = {getUserDashboard};