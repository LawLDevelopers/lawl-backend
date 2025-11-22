const {admin, functions} = require("../../utils/firebase");

const getLawyerDashboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
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
      throw new functions.https.HttpsError("permission-denied", "User is not a lawyer");
    }
    
    // Get lawyer's cases
    const casesQuery = admin.firestore()
      .collection("cases")
      .where("lawyerId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(10);
    
    const casesSnapshot = await casesQuery.get();
    
    const recentCases = [];
    casesSnapshot.forEach(doc => {
      const caseData = doc.data();
      recentCases.push({
        id: doc.id,
        title: caseData.title,
        status: caseData.status,
        percentageCompleted: caseData.percentageCompleted,
        createdAt: caseData.createdAt
      });
    });
    
    // Get lawyer's recent chats
    const chatsQuery = admin.firestore()
      .collection("chats")
      .where("lawyerId", "==", userId)
      .orderBy("updatedAt", "desc")
      .limit(5);
    
    const chatsSnapshot = await chatsQuery.get();
    
    const recentChats = [];
    chatsSnapshot.forEach(doc => {
      const chatData = doc.data();
      recentChats.push({
        id: doc.id,
        userId: chatData.userId,
        status: chatData.status,
        updatedAt: chatData.updatedAt
      });
    });
    
    // Get lawyer's recent calls
    const callsQuery = admin.firestore()
      .collection("calls")
      .where("lawyerId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(5);
    
    const callsSnapshot = await callsQuery.get();
    
    const recentCalls = [];
    callsSnapshot.forEach(doc => {
      const callData = doc.data();
      recentCalls.push({
        id: doc.id,
        userId: callData.userId,
        callType: callData.callType,
        status: callData.status,
        duration: callData.duration,
        cost: callData.cost,
        createdAt: callData.createdAt
      });
    });
    
    // Prepare dashboard data
    const dashboardData = {
      profile: {
        name: userData.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        photo: userData.photo,
        specialization: userData.specialization,
        practicingCity: userData.practicingCity,
        practicingState: userData.practicingState,
        experience: userData.experience,
        bio: userData.bio,
        rating: userData.rating,
        reviewCount: userData.reviewCount
      },
      metrics: {
        totalCasesHandled: userData.totalCasesHandled || 0,
        totalConsultationsCompleted: userData.totalConsultationsCompleted || 0,
        totalEarnings: userData.totalEarnings || 0,
        walletBalance: userData.walletBalance || 0
      },
      consultationRates: userData.consultationRate || {
        audio: 0,
        video: 0,
        chat: 0,
        perCase: 0
      },
      recentCases: recentCases,
      recentChats: recentChats,
      recentCalls: recentCalls
    };
    
    return {
      success: true,
      dashboard: dashboardData
    };
  } catch (error) {
    console.error("Error getting lawyer dashboard:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get lawyer dashboard");
  }
});

module.exports = {getLawyerDashboard};