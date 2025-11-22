const {admin, functions} = require("../utils/firebase");
const axios = require('axios');

const sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {userId, title, body, dataPayload} = data;
  
  // Validate required fields
  if (!userId || !title || !body) {
    throw new functions.https.HttpsError("invalid-argument", "User ID, title, and body are required");
  }

  try {
    // Only allow admins to send notifications to other users
    if (context.auth.uid !== userId) {
      // Check if user is admin
      const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Admin user not found");
      }
      
      const adminData = adminDoc.data();
      if (adminData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can send notifications to other users");
      }
    }
    
    // Get user's FCM token
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError("not-found", "User not found");
    }
    
    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;
    
    if (!fcmToken) {
      throw new functions.https.HttpsError("failed-precondition", "User does not have an FCM token");
    }
    
    // Prepare notification payload
    const payload = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body
        },
        data: dataPayload || {}
      }
    };
    
    // Send notification using Firebase Admin SDK
    const response = await admin.messaging().send(payload.message);
    
    // Log notification in user's notification history
    const notification = {
      id: admin.firestore().collection("users").doc(userId).collection("notifications").doc().id,
      title: title,
      body: body,
      data: dataPayload || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    };
    
    await admin.firestore().collection("users").doc(userId).collection("notifications").doc(notification.id).set(notification);
    
    return {
      success: true,
      message: "Notification sent successfully",
      messageId: response
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to send push notification");
  }
});

module.exports = {sendPushNotification};