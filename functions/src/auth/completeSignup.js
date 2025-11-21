const {admin, functions} = require("../utils/firebase");

const completeSignup = functions.https.onCall(async (data, context) => {
  const {name, email, phoneNumber, otp, role} = data;
  
  // Validate required fields
  if (!name || !phoneNumber || !otp) {
    throw new functions.https.HttpsError("invalid-argument", "Name, phone number, and OTP are required");
  }

  // Validate role if provided
  const validRoles = ["user", "lawyer"];
  if (role && !validRoles.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
  }

  try {
    // In a real implementation, you would verify the OTP with your SMS provider here
    // For demo purposes, we'll simulate successful verification
    
    // Check if user already exists by phone number
    let userRecord;
    let uid;
    
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
      uid = userRecord.uid;
    } catch (error) {
      // User doesn't exist, create them
      const createUserParams = {
        displayName: name,
        phoneNumber: phoneNumber
      };
      
      if (email) {
        createUserParams.email = email;
      }
      
      userRecord = await admin.auth().createUser(createUserParams);
      uid = userRecord.uid;
    }
    
    // Prepare user data for Firestore
    const userData = {
      uid: uid,
      name: name,
      phoneNumber: phoneNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(email && {email: email}),
      ...(role && {role: role})
    };
    
    // Set custom claims
    const userRole = role || "user";
    await admin.auth().setCustomUserClaims(uid, {role: userRole});
    userData.role = userRole;
    
    // Create or update user document in Firestore
    await admin.firestore().collection("users").doc(uid).set(userData, {merge: true});
    
    // Generate custom token for client-side signInWithCustomToken
    const customToken = await admin.auth().createCustomToken(uid);
    
    return {
      success: true,
      message: "Signup completed successfully",
      customToken: customToken,
      role: userRole,
      uid: uid
    };
  } catch (error) {
    console.error("Error completing signup:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to complete signup");
  }
});

module.exports = {completeSignup};