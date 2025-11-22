const {admin, functions} = require("../../utils/firebase");

const assignUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {role} = data;
  
  if (!role) {
    throw new functions.https.HttpsError("invalid-argument", "Role is required");
  }

  // Validate role
  const validRoles = ["user", "lawyer", "admin"];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
  }

  try {
    const uid = context.auth.uid;
    
    // Update user's custom claims
    await admin.auth().setCustomUserClaims(uid, {role: role});
    
    // Update user document in Firestore
    await admin.firestore().collection("users").doc(uid).update({
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return {
      success: true,
      message: `User role updated to ${role}`,
      role: role
    };
  } catch (error) {
    console.error("Error assigning user role:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to assign user role");
  }
});

module.exports = {assignUserRole};