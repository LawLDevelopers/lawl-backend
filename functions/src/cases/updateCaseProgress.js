const {admin, functions} = require("../utils/firebase");

const updateCaseProgress = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {caseId, percentageCompleted, notes} = data;
  
  // Validate required fields
  if (!caseId || percentageCompleted === undefined) {
    throw new functions.https.HttpsError("invalid-argument", "Case ID and percentage completed are required");
  }

  // Validate percentage
  if (typeof percentageCompleted !== "number" || percentageCompleted < 0 || percentageCompleted > 100) {
    throw new functions.https.HttpsError("invalid-argument", "Percentage completed must be a number between 0 and 100");
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
    
    // Verify that the user is the assigned lawyer
    if (caseData.lawyerId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Only the assigned lawyer can update case progress");
    }
    
    // Prepare update data
    const updateData = {
      percentageCompleted: percentageCompleted,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update status based on percentage
    if (percentageCompleted === 0) {
      updateData.status = "not_started";
    } else if (percentageCompleted > 0 && percentageCompleted < 100) {
      updateData.status = "in-progress";
    } else if (percentageCompleted === 100) {
      updateData.status = "completed";
    }
    
    // Add progress note if provided
    if (notes) {
      const progressNote = {
        note: notes,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        lawyerId: userId
      };
      
      updateData.progressNotes = admin.firestore.FieldValue.arrayUnion(progressNote);
    }
    
    // Update the case document
    await caseRef.update(updateData);
    
    // If case is completed, update user and lawyer metrics
    if (percentageCompleted === 100) {
      // Update lawyer's total cases handled
      await admin.firestore().collection("users").doc(userId).update({
        totalCasesHandled: admin.firestore.FieldValue.increment(1),
        totalConsultationsCompleted: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update user's case history
      await admin.firestore().collection("users").doc(caseData.userId).update({
        caseHistory: admin.firestore.FieldValue.arrayUnion(caseId),
        activeCases: admin.firestore.FieldValue.arrayRemove(caseId),
        lastConsultationDate: admin.firestore.FieldValue.serverTimestamp(),
        totalConsultationsDone: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: "Case progress updated successfully",
      caseId: caseId,
      percentageCompleted: percentageCompleted,
      status: updateData.status
    };
  } catch (error) {
    console.error("Error updating case progress:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to update case progress");
  }
});

module.exports = {updateCaseProgress};