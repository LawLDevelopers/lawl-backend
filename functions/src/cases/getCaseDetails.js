const {admin, functions} = require("../utils/firebase");

const getCaseDetails = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {caseId} = data;
  
  // Validate required fields
  if (!caseId) {
    throw new functions.https.HttpsError("invalid-argument", "Case ID is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Get the case document
    const caseRef = admin.firestore().collection("cases").doc(caseId);
    const caseDoc = await caseRef.get();
    
    if (!caseDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Case not found");
    }
    
    const caseData = caseDoc.data();
    
    // Verify that the user is either the client or the lawyer
    if (caseData.userId !== userId && caseData.lawyerId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "You don't have permission to view this case");
    }
    
    // Get user and lawyer details
    const userDoc = await admin.firestore().collection("users").doc(caseData.userId).get();
    const lawyerDoc = await admin.firestore().collection("users").doc(caseData.lawyerId).get();
    
    const userDetails = userDoc.data();
    const lawyerDetails = lawyerDoc.data();
    
    return {
      success: true,
      case: {
        id: caseId,
        ...caseData,
        user: {
          id: caseData.userId,
          name: userDetails?.name || "",
          email: userDetails?.email || ""
        },
        lawyer: {
          id: caseData.lawyerId,
          name: lawyerDetails?.name || "",
          email: lawyerDetails?.email || "",
          specialization: lawyerDetails?.specialization || ""
        }
      }
    };
  } catch (error) {
    console.error("Error getting case details:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get case details");
  }
});

module.exports = {getCaseDetails};