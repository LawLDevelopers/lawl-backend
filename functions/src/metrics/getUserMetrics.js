const {admin, functions} = require("../utils/firebase");

const getUserMetrics = functions.https.onCall(async (data, context) => {
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
    
    // Prepare metrics based on user role
    let metrics = {
      role: userData.role,
      name: userData.name,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      photo: userData.photo,
      walletBalance: userData.walletBalance || 0,
      lastActive: userData.lastActive,
      createdAt: userData.createdAt
    };
    
    if (userData.role === "user") {
      // User-specific metrics
      metrics = {
        ...metrics,
        totalConsultationsDone: userData.totalConsultationsDone || 0,
        totalMoneySpent: userData.totalMoneySpent || 0,
        mostConsultedLawyer: userData.mostConsultedLawyer,
        lastConsultationDate: userData.lastConsultationDate,
        favoriteLawyers: userData.favoriteLawyers || [],
        activeCases: userData.activeCases || [],
        caseHistory: userData.caseHistory || []
      };
    } else if (userData.role === "lawyer") {
      // Lawyer-specific metrics
      metrics = {
        ...metrics,
        firstName: userData.firstName,
        lastName: userData.lastName,
        barCouncilId: userData.barCouncilId,
        qualification: userData.qualification,
        specialization: userData.specialization,
        languages: userData.languages || [],
        experience: userData.experience,
        bio: userData.bio,
        practicingState: userData.practicingState,
        practicingCity: userData.practicingCity,
        verificationStatus: userData.verificationStatus,
        availabilityStatus: userData.availabilityStatus,
        practiceCourtTier: userData.practiceCourtTier,
        enrollmentState: userData.enrollmentState,
        rating: userData.rating || 0,
        reviewCount: userData.reviewCount || 0,
        totalCasesHandled: userData.totalCasesHandled || 0,
        totalConsultationsCompleted: userData.totalConsultationsCompleted || 0,
        totalEarnings: userData.totalEarnings || 0,
        consultationRate: userData.consultationRate || {
          audio: 0,
          video: 0,
          chat: 0,
          perCase: 0
        },
        workingHours: userData.workingHours,
        scheduledSessions: userData.scheduledSessions || []
      };
    }
    
    return {
      success: true,
      metrics: metrics
    };
  } catch (error) {
    console.error("Error getting user metrics:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get user metrics");
  }
});

module.exports = {getUserMetrics};