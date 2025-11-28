const {admin, functions} = require("../utils/firebase");
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const initiateAgoraCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {sessionId, participants, isVideo} = data;
  
  // Validate required fields
  if (!sessionId || !participants || !Array.isArray(participants)) {
    throw new functions.https.HttpsError("invalid-argument", "Session ID and participants array are required");
  }

  if (participants.length < 2) {
    throw new functions.https.HttpsError("invalid-argument", "At least two participants are required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify the user is one of the participants
    if (!participants.includes(userId)) {
      throw new functions.https.HttpsError("permission-denied", "User must be a participant in the call");
    }
    
    // Verify all participants exist
    for (const participantId of participants) {
      const userDoc = await admin.firestore().collection("users").doc(participantId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", `Participant ${participantId} not found`);
      }
    }
    
    // Get Agora configuration
    const appId = functions.config().agora.appid;
    const appCertificate = functions.config().agora.cert;
    
    if (!appId || !appCertificate) {
      throw new functions.https.HttpsError("failed-precondition", "Agora configuration not found");
    }
    
    // Generate Agora token
    const channelName = `call_${sessionId}`;
    const uid = 0; // Set to 0 to auto-generate uid
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600; // 1 hour
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);
    
    // Create call session in Firestore
    const callData = {
      sessionId: sessionId,
      participants: participants,
      isVideo: isVideo || false,
      status: "initiated",
      agoraChannel: channelName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAt: null,
      endedAt: null
    };
    
    await admin.firestore().collection("agoraCalls").doc(sessionId).set(callData);
    
    // Update call history for all participants
    for (const participantId of participants) {
      await admin.firestore().collection("users").doc(participantId).update({
        callHistory: admin.firestore.FieldValue.arrayUnion(sessionId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: "Agora call session created successfully",
      sessionId: sessionId,
      agoraChannel: channelName,
      agoraToken: token,
      appId: appId
    };
  } catch (error) {
    console.error("Error initiating Agora call:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to initiate Agora call");
  }
});

module.exports = {initiateAgoraCall};