const {admin, functions} = require("../utils/firebase");

const createUserDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userId, userData} = data;
  
  // Validate required fields
  if (!userId || !userData) {
    throw new functions.https.HttpsError("invalid-argument", "User ID and user data are required");
  }

  try {
    // Only allow admins to create user documents for others
    if (context.auth.uid !== userId) {
      // Check if user is admin
      const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Admin user not found");
      }
      
      const adminData = adminDoc.data();
      if (adminData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can create user documents for others");
      }
    }
    
    // Prepare user document
    const userDocument = {
      id: userId,
      name: userData.name || "",
      email: userData.email || "",
      phoneNumber: userData.phoneNumber || "",
      photoUrl: userData.photoUrl || "",
      creditBalance: userData.creditBalance || 0,
      isLawyer: userData.isLawyer || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      ...userData // Include any additional fields
    };
    
    // Create or update user document
    await admin.firestore().collection("users").doc(userId).set(userDocument, {merge: true});
    
    return {
      success: true,
      message: "User document created/updated successfully"
    };
  } catch (error) {
    console.error("Error creating user document:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create user document");
  }
});

module.exports = {createUserDocument};