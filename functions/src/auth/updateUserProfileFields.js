const {admin, functions} = require("../utils/firebase");

const updateUserProfileFields = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userId, fieldsToUpdate} = data;
  
  // Validate required fields
  if (!userId || !fieldsToUpdate) {
    throw new functions.https.HttpsError("invalid-argument", "User ID and fields to update are required");
  }

  try {
    // Only allow users to update their own profile or admins to update any user profile
    if (context.auth.uid !== userId) {
      // Check if user is admin
      const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Admin user not found");
      }
      
      const adminData = adminDoc.data();
      if (adminData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can update other user profiles");
      }
    }
    
    // Prepare update data
    const updateData = {
      ...fieldsToUpdate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Remove any fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    
    // Update user document
    await admin.firestore().collection("users").doc(userId).update(updateData);
    
    return {
      success: true,
      message: "User profile updated successfully"
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update user profile");
  }
});

module.exports = {updateUserProfileFields};