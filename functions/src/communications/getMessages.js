const {admin, functions} = require("../utils/firebase");

const getMessages = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {chatId, limit = 50} = data;
  
  // Validate required fields
  if (!chatId) {
    throw new functions.https.HttpsError("invalid-argument", "Chat ID is required");
  }

  try {
    const userId = context.auth.uid;
    
    // Verify the chat exists and user is a participant
    const chatRef = admin.firestore().collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();
    
    if (!chatDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Chat not found");
    }
    
    const chatData = chatDoc.data();
    
    // Check if user is a participant in the chat
    if (chatData.userId !== userId && chatData.lawyerId !== userId) {
      throw new functions.https.HttpsError("permission-denied", "Not authorized to access this chat");
    }
    
    // Get messages from chat
    const messagesSnapshot = await admin.firestore()
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    
    const messages = [];
    messagesSnapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Return messages in chronological order (oldest first)
    messages.reverse();
    
    return {
      success: true,
      messages: messages
    };
  } catch (error) {
    console.error("Error getting messages:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to get messages");
  }
});

module.exports = {getMessages};