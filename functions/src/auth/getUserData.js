const {admin, functions} = require("../utils/firebase");

const getUserData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userId} = data;
  
  // Validate required fields
  if (!userId) {
    throw new functions.https.HttpsError("invalid-argument", "User ID is required");
  }

  try {
    // Only allow users to get their own data or admins to get any user data
    if (context.auth.uid !== userId) {
      // Check if user is admin
      const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Admin user not found");
      }
      
      const adminData = adminDoc.data();
      if (adminData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can retrieve other user data");
      }
    }
    
    // Retrieve user document
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      userData: userData
    };
  } catch (error) {
    console.error("Error retrieving user data:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to retrieve user data");
  }
});

module.exports = {getUserData};