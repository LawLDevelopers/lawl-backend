const {admin, functions} = require("../utils/firebase");
const {assertSuperAdmin} = require("../utils/roleUtils");

const getPendingKycSubmissions = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Only super admins can access pending KYC submissions
  await assertSuperAdmin(context.auth.uid);

  const {limit = 50} = data;

  try {
    // Get pending KYC submissions
    const query = admin.firestore()
      .collection("kyc_submissions")
      .where("status", "==", "pending")
      .orderBy("submittedAt", "desc")
      .limit(limit);
    
    const kycSnapshot = await query.get();
    
    const pendingSubmissions = [];
    kycSnapshot.forEach(doc => {
      pendingSubmissions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get user details for each submission
    const submissionsWithUserDetails = [];
    for (const submission of pendingSubmissions) {
      const userDoc = await admin.firestore().collection("users").doc(submission.userId).get();
      const userData = userDoc.data();
      
      submissionsWithUserDetails.push({
        ...submission,
        user: {
          name: userData?.name || "",
          email: userData?.email || "",
          phoneNumber: userData?.phoneNumber || ""
        }
      });
    }
    
    return {
      success: true,
      submissions: submissionsWithUserDetails,
      count: submissionsWithUserDetails.length
    };
  } catch (error) {
    console.error("Error getting pending KYC submissions:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get pending KYC submissions");
  }
});

module.exports = {getPendingKycSubmissions};