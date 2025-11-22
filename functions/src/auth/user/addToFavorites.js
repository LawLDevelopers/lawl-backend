const {admin, functions} = require("../../utils/firebase");

const addToFavorites = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {lawyerId} = data;
  
  // Validate required fields
  if (!lawyerId) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify the lawyer exists and is verified
    const lawyerDoc = await admin.firestore().collection("users").doc(lawyerId).get();
    
    if (!lawyerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Lawyer not found");
    }
    
    const lawyerData = lawyerDoc.data();
    
    if (lawyerData.role !== "lawyer") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid lawyer ID");
    }
    
    if (lawyerData.verificationStatus !== "verified") {
      throw new functions.https.HttpsError("failed-precondition", "Lawyer is not verified");
    }
    
    // Add lawyer to user's favorites
    await admin.firestore().collection("users").doc(userId).update({
      favoriteLawyers: admin.firestore.FieldValue.arrayUnion(lawyerId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Lawyer added to favorites successfully"
    };
  } catch (error) {
    console.error("Error adding to favorites:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to add lawyer to favorites");
  }
});

module.exports = {addToFavorites};