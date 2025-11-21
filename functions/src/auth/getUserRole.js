const {admin, functions} = require("../utils/firebase");

const getUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  try {
    const user = await admin.auth().getUser(context.auth.uid);
    return {role: user.customClaims?.role || "user"};
  } catch (error) {
    console.error("Error getting user role:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get user role");
  }
});

module.exports = {getUserRole};