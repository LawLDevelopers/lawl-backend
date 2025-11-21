const {admin, functions} = require("../utils/firebase");

const registerUser = functions.https.onCall(async (data, context) => {
  // For signup, user might not be authenticated yet if using phone auth
  // If authenticated, we use that UID, otherwise we'll create a new user
  
  const {name, email, phoneNumber, role, otp} = data;
  
  // Validate required fields
  if (!name || !phoneNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Name and phone number are required");
  }

  // Validate role if provided
  const validRoles = ["user", "lawyer"];
  if (role && !validRoles.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
  }

  try {
    let uid;
    let userRecord;
    
    // Check if user already exists by phone number
    try {
      userRecord = await admin.auth().getUserByPhoneNumber(phoneNumber);
      uid = userRecord.uid;
      
      // If user exists but we're providing OTP, this might be a verification step
      // For now, we'll update the existing user
    } catch (error) {
      // User doesn't exist, we'll create them
      const createUserParams = {
        displayName: name,
        phoneNumber: phoneNumber
      };
      
      if (email) {
        createUserParams.email = email;
      }
      
      // Create user in Firebase Authentication
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
    
    // Set custom claims if role is provided
    if (role) {
      await admin.auth().setCustomUserClaims(uid, {role: role});
    } else {
      // Default to user role if not specified
      await admin.auth().setCustomUserClaims(uid, {role: "user"});
      userData.role = "user";
    }
    
    // Create or update user document in Firestore
    await admin.firestore().collection("users").doc(uid).set(userData, {merge: true});
    
    // Generate custom token for client-side signInWithCustomToken
    const customToken = await admin.auth().createCustomToken(uid);
    
    return {
      success: true,
      message: "User registered successfully",
      customToken: customToken,
      role: role || "user",
      uid: uid
    };
  } catch (error) {
    console.error("Error registering user:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to register user");
  }
});

module.exports = {registerUser};