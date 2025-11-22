const {admin, functions} = require("../utils/firebase");

const initiateChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {lawyerId, message} = data;
  
  // Validate required fields
  if (!lawyerId) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID is required");
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
    
    // Create chat session
    const chatData = {
      userId: userId,
      lawyerId: lawyerId,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      messages: [],
      rate: lawyerData.consultationRate?.chat || 0,
      walletBalanceAtStart: walletBalance
    };
    
    // Add chat to Firestore
    const chatRef = await admin.firestore().collection("chats").add(chatData);
    
    // Add initial message if provided
    if (message) {
      const initialMessage = {
        senderId: userId,
        message: message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await chatRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(initialMessage)
      });
    }
    
    // Update chat history for both user and lawyer
    await admin.firestore().collection("users").doc(userId).update({
      chatHistory: admin.firestore.FieldValue.arrayUnion(chatRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await admin.firestore().collection("users").doc(lawyerId).update({
      chatHistory: admin.firestore.FieldValue.arrayUnion(chatRef.id),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Chat initiated successfully",
      chatId: chatRef.id,
      chatData: {
        id: chatRef.id,
        ...chatData
      }
    };
  } catch (error) {
    console.error("Error initiating chat:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to initiate chat");
  }
});

module.exports = {initiateChat};