const {admin, functions} = require("../../utils/firebase");

const getLawyerData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {lawyerId} = data;
  
  // Validate required fields
  if (!lawyerId) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID is required");
  }

  try {
    // Anyone can retrieve lawyer data (no permission restrictions)
    
    // Retrieve lawyer document
    const lawyerDoc = await admin.firestore().collection("lawyers").doc(lawyerId).get();
    
    if (!lawyerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Lawyer not found");
    }
    
    const lawyerData = lawyerDoc.data();
    
    return {
      success: true,
      lawyerData: lawyerData
    };
  } catch (error) {
    console.error("Error retrieving lawyer data:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to retrieve lawyer data");
  }
});

module.exports = {getLawyerData};