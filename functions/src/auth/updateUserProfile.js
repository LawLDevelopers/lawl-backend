const {admin, functions} = require("../utils/firebase");

const updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {name, email, additionalData} = data;
  
  // At least one field should be provided for update
  if (!name && !email && !additionalData) {
    throw new functions.https.HttpsError("invalid-argument", "At least one field (name, email, or additionalData) is required for update");
  }

  try {
    const uid = context.auth.uid;
    
    // Prepare update data
    const updateData = {};
    
    if (name) {
      updateData.name = name;
      // Also update display name in Firebase Auth
      await admin.auth().updateUser(uid, {displayName: name});
    }
    
    if (email) {
      updateData.email = email;
      // Also update email in Firebase Auth
      await admin.auth().updateUser(uid, {email: email});
    }
    
    if (additionalData) {
      Object.assign(updateData, additionalData);
    }
    
    updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Update user document in Firestore
    await admin.firestore().collection("users").doc(uid).update(updateData);
    
    return {
      success: true,
      message: "Profile updated successfully",
      updatedFields: Object.keys(updateData).filter(key => key !== "updatedAt")
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update profile");
  }
});

module.exports = {updateUserProfile};