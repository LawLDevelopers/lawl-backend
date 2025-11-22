const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const reviewKyc = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can review KYC
  await assertSuperAdmin(context.auth.uid);

  const {lawyerId, status, reviewNotes} = data;
  
  // Validate required fields
  if (!lawyerId || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID and status are required");
  }

  // Validate status
  const validStatuses = ["approved", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status. Must be 'approved' or 'rejected'");
  }

  try {
    // Update KYC submission
    await admin.firestore().collection("kyc_submissions").doc(lawyerId).update({
      status: status,
      reviewNotes: reviewNotes || null,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: context.auth.uid
    });
    
    // Update user's verification status and KYC status
    await admin.firestore().collection("users").doc(lawyerId).update({
      verificationStatus: status === "approved" ? "verified" : "rejected",
      kycStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: `KYC review completed. Status: ${status}`,
      lawyerId: lawyerId,
      status: status
    };
  } catch (error) {
    console.error("Error reviewing KYC:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to review KYC");
  }
});

module.exports = {reviewKyc};