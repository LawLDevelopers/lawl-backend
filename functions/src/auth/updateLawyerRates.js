const {admin, functions} = require("../utils/firebase");

const updateLawyerRates = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {audio, video, chat, perCase} = data;
  
  // At least one rate must be provided
  if (audio === undefined && video === undefined && chat === undefined && perCase === undefined) {
    throw new functions.https.HttpsError("invalid-argument", "At least one rate must be provided");
  }

  try {
    const uid = context.auth.uid;
    
    // Verify user is a lawyer
    const user = await admin.auth().getUser(uid);
    const role = user.customClaims?.role;
    
    if (role !== "lawyer") {
      throw new functions.https.HttpsError("permission-denied", "Only lawyers can update rates");
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Only update provided rates
    if (audio !== undefined) {
      if (typeof audio !== "number" || audio < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Audio rate must be a valid non-negative number");
      }
      updateData["consultationRate.audio"] = audio;
    }
    
    if (video !== undefined) {
      if (typeof video !== "number" || video < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Video rate must be a valid non-negative number");
      }
      updateData["consultationRate.video"] = video;
    }
    
    if (chat !== undefined) {
      if (typeof chat !== "number" || chat < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Chat rate must be a valid non-negative number");
      }
      updateData["consultationRate.chat"] = chat;
    }
    
    if (perCase !== undefined) {
      if (typeof perCase !== "number" || perCase < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Per case rate must be a valid non-negative number");
      }
      updateData["consultationRate.perCase"] = perCase;
    }
    
    // Update user document in Firestore
    await admin.firestore().collection("users").doc(uid).update(updateData);
    
    return {
      success: true,
      message: "Lawyer rates updated successfully"
    };
  } catch (error) {
    console.error("Error updating lawyer rates:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update lawyer rates");
  }
});

module.exports = {updateLawyerRates};