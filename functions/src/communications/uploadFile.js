const {admin, functions} = require("../utils/firebase");
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage();
const bucketName = 'lawl-legal-aid.appspot.com'; // Replace with your Firebase Storage bucket name

const uploadFile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {fileName, fileType, chatId} = data;
  
  // Validate required fields
  if (!fileName || !fileType || !chatId) {
    throw new functions.https.HttpsError("invalid-argument", "File name, file type, and chat ID are required");
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
      throw new functions.https.HttpsError("permission-denied", "Not authorized to upload files to this chat");
    }
    
    // Generate a unique file name
    const timestamp = Date.now();
    const uniqueFileName = `${userId}_${timestamp}_${fileName}`;
    
    // Get a signed URL for uploading
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`chats/${chatId}/${uniqueFileName}`);
    
    const [uploadUrl] = await file.createSignedUrl('write', {
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: fileType,
    });
    
    // Get download URL for accessing the file later
    const [downloadUrl] = await file.createSignedUrl('read', {
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    return {
      success: true,
      message: "Upload URL generated successfully",
      uploadUrl: uploadUrl,
      downloadUrl: downloadUrl,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to generate upload URL");
  }
});

module.exports = {uploadFile};