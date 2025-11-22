const {admin, functions} = require("../../utils/firebase");

const removeFromFavorites = functions.https.onCall(async (data, context) => {
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
    
    // Remove lawyer from user's favorites
    await admin.firestore().collection("users").doc(userId).update({
      favoriteLawyers: admin.firestore.FieldValue.arrayRemove(lawyerId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Lawyer removed from favorites successfully"
    };
  } catch (error) {
    console.error("Error removing from favorites:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to remove lawyer from favorites");
  }
});

module.exports = {removeFromFavorites};