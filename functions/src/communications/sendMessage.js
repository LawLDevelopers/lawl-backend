const {admin, functions} = require("../utils/firebase");

const sendMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {chatId, content, type = "text"} = data;
  
  // Validate required fields
  if (!chatId || !content) {
    throw new functions.https.HttpsError("invalid-argument", "Chat ID and content are required");
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
      throw new functions.https.HttpsError("permission-denied", "Not authorized to send messages in this chat");
    }
    
    // Create message object
    const message = {
      id: admin.firestore().collection("chats").doc(chatId).collection("messages").doc().id,
      senderId: userId,
      content: content,
      type: type, // text, image, document
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent"
    };
    
    // Add message to chat
    await admin.firestore().collection("chats").doc(chatId).collection("messages").doc(message.id).set(message);
    
    // Update chat's updatedAt timestamp
    await chatRef.update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Message sent successfully",
      messageId: message.id
    };
  } catch (error) {
    console.error("Error sending message:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to send message");
  }
});

module.exports = {sendMessage};