const {admin, functions} = require("../utils/firebase");

const checkOnboardingStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const uid = context.auth.uid;
    
    // Check if user has completed onboarding by checking if they have a role other than default
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return {
        completed: false,
        message: "User document not found"
      };
    }
    
    const userData = userDoc.data();
    const hasRole = userData.role && userData.role !== "user";
    
    return {
      completed: !!hasRole,
      role: userData.role || null,
      message: hasRole ? "Onboarding completed" : "Onboarding not completed"
    };
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to check onboarding status");
  }
});

module.exports = {checkOnboardingStatus};