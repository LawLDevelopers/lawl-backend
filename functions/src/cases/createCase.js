const {admin, functions} = require("../utils/firebase");

const createCase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {title, description, caseType, lawyerId} = data;
  
  // Validate required fields
  if (!title || !caseType || !lawyerId) {
    throw new functions.https.HttpsError("invalid-argument", "Title, case type, and lawyer ID are required");
  }

  try {
    const userId = context.auth.uid;
    
    // Create case document
    const caseData = {
      title: title,
      description: description || "",
      caseType: caseType,
      userId: userId,
      lawyerId: lawyerId,
      status: "not_started",
      percentageCompleted: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      progressNotes: [],
      fileAttachments: [],
      charges: {
        estimatedCost: 0,
        billingModel: null, // per_hour, per_session, per_case, hybrid
        actualCost: 0
      },
      chatHistory: [],
      callRecords: []
    };
    
    // Add case to Firestore
    const caseRef = await admin.firestore().collection("cases").add(caseData);
    
    // Update user's active cases
    await admin.firestore().collection("users").doc(userId).update({
      activeCases: admin.firestore.FieldValue.arrayUnion(caseRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update lawyer's assigned cases
    await admin.firestore().collection("users").doc(lawyerId).update({
      assignedCases: admin.firestore.FieldValue.arrayUnion(caseRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Case created successfully",
      caseId: caseRef.id,
      caseData: {
        id: caseRef.id,
        ...caseData
      }
    };
  } catch (error) {
    console.error("Error creating case:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create case");
  }
});

module.exports = {createCase};