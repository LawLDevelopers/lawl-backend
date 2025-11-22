const {admin, functions} = require("../utils/firebase");

const initiateCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {lawyerId, callType} = data;
  
  // Validate required fields
  if (!lawyerId || !callType) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID and call type are required");
  }

  // Validate call type
  const validCallTypes = ["audio", "video"];
  if (!validCallTypes.includes(callType)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid call type. Must be 'audio' or 'video'");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify the lawyer exists and is verified
    const lawyerDoc = await admin.firestore().collection("users").doc(lawyerId).get();
    
    if (!lawyerDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Lawyer not found");
    }
    
    const lawyerData = lawyerDoc.data();
    
    if (lawyerData.role !== "lawyer") {
      throw new functions.https.HttpsError("invalid-argument", "Invalid lawyer ID");
    }
    
    if (lawyerData.verificationStatus !== "verified") {
      throw new functions.https.HttpsError("failed-precondition", "Lawyer is not verified");
    }
    
    // Check user's wallet balance
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();
    const walletBalance = userData.walletBalance || 0;
    
    // Get lawyer's rate for this call type
    const rate = lawyerData.consultationRate?.[callType] || 0;
    
    // Create call session
    const callData = {
      userId: userId,
      lawyerId: lawyerId,
      callType: callType,
      status: "initiated",
      rate: rate,
      walletBalanceAtStart: walletBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt: null,
      endedAt: null,
      duration: 0,
      cost: 0
    };
    
    // Add call to Firestore
    const callRef = await admin.firestore().collection("calls").add(callData);
    
    // Update call history for both user and lawyer
    await admin.firestore().collection("users").doc(userId).update({
      callHistory: admin.firestore.FieldValue.arrayUnion(callRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection("users").doc(lawyerId).update({
      callHistory: admin.firestore.FieldValue.arrayUnion(callRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Call initiated successfully",
      callId: callRef.id,
      meetingRoomId: `meeting_${callRef.id}`, // Temporary meeting room ID
      callData: {
        id: callRef.id,
        ...callData
      }
    };
  } catch (error) {
    console.error("Error initiating call:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to initiate call");
  }
});

module.exports = {initiateCall};