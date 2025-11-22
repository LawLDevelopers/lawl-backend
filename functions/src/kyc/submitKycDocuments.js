const {admin, functions} = require("../utils/firebase");

const submitKycDocuments = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {documents} = data;
  
  // Validate required fields
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Documents array is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify user is a lawyer
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    
    if (userData.role !== "lawyer") {
      throw new functions.https.HttpsError("permission-denied", "Only lawyers can submit KYC documents");
    }
    
    // Prepare KYC document data
    const kycData = {
      userId: userId,
      status: "pending",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      documents: documents.map(doc => ({
        type: doc.type, // bar_council_id, identity_proof, professional_photo, law_degree
        url: doc.url,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp()
      })),
      reviewNotes: null,
      reviewedAt: null,
      reviewedBy: null
    };
    
    // Save KYC data to Firestore
    await admin.firestore().collection("kyc_submissions").doc(userId).set(kycData);
    
    // Update user's KYC status
    await admin.firestore().collection("users").doc(userId).update({
      kycStatus: "pending",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "KYC documents submitted successfully",
      kycId: userId
    };
  } catch (error) {
    console.error("Error submitting KYC documents:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to submit KYC documents");
  }
});

module.exports = {submitKycDocuments};