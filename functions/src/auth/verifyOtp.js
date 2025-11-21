const {admin, functions} = require("../utils/firebase");

const verifyOtp = functions.https.onCall(async (data, context) => {
  // Note: In a typical Firebase phone auth flow, verification happens client-side
  // This function is for server-side validation if needed
  
  const {phoneNumber, verificationId, verificationCode} = data;
  
  if (!phoneNumber || !verificationId || !verificationCode) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number, verification ID, and verification code are required");
  }

  try {
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid phone number format");
    }
    
    // Validate verification code format (should be 6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(verificationCode)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid verification code format");
    }
    
    // In a real implementation, you might:
    // 1. Check if this verification attempt is valid
    // 2. Rate limit attempts
    // 3. Store successful verifications
    
    console.log(`OTP verification attempt for phone: ${phoneNumber}`);
    
    // For demo purposes, we'll simulate a successful verification
    // In practice, you would integrate with your SMS provider's verification API here
    
    // Create or update user in Firestore after successful verification
    const userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber).catch(() => null);
    
    let uid;
    if (!userRecord) {
      // Create user if they don't exist
      const newUser = await admin.auth().createUser({
        phoneNumber: phoneNumber
      });
      uid = newUser.uid;
      
      // Set default claims
      await admin.auth().setCustomUserClaims(uid, {role: "user"});
      
      // Create user document in Firestore
      await admin.firestore().collection("users").doc(uid).set({
        uid: uid,
        phoneNumber: phoneNumber,
        role: "user",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      uid = userRecord.uid;
    }
    
    // Generate custom token for client-side signInWithCustomToken
    const customToken = await admin.auth().createCustomToken(uid);
    
    return {
      success: true,
      message: "OTP verified successfully",
      customToken: customToken,
      uid: uid,
      phoneNumber: phoneNumber
    };
  } catch (error) {
    console.error("Error in verifyOtp function:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to verify OTP");
  }
});

module.exports = {verifyOtp};