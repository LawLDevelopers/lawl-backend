const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const updateLawyerVerification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can verify lawyers
  await assertSuperAdmin(context.auth.uid);

  const {lawyerUid, verificationStatus, rejectionReason} = data;
  
  // Validate required fields
  if (!lawyerUid || !verificationStatus) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer UID and verification status are required");
  }

  // Validate verification status
  const validStatuses = ["pending", "verified", "rejected"];
  if (!validStatuses.includes(verificationStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid verification status");
  }

  try {
    // Verify the user is a lawyer
    const user = await admin.auth().getUser(lawyerUid);
    const role = user.customClaims?.role;
    
    if (role !== "lawyer") {
      throw new functions.https.HttpsError("invalid-argument", "User is not a lawyer");
    }
    
    // Prepare update data
    const updateData = {
      verificationStatus: verificationStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // If rejected, add rejection reason
    if (verificationStatus === "rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    
    // Update user document in Firestore
    await admin.firestore().collection("users").doc(lawyerUid).update(updateData);
    
    return {
      success: true,
      message: `Lawyer verification status updated to ${verificationStatus}`,
      lawyerUid: lawyerUid,
      verificationStatus: verificationStatus
    };
  } catch (error) {
    console.error("Error updating lawyer verification:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update lawyer verification");
  }
});

module.exports = {updateLawyerVerification};