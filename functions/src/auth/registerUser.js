const {admin, functions} = require("../utils/firebase");

const registerUser = functions.https.onCall(async (data, context) => {
  // For signup, user might not be authenticated yet if using phone auth
  // If authenticated, we use that UID, otherwise we'll create a new user
  
  const {name, email, phoneNumber, role, firstName, lastName, barCouncilId} = data;
  
  // Validate required fields
  if (!name || !phoneNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Name and phone number are required");
  }

  // Validate role if provided
  const validRoles = ["user", "lawyer"];
  if (role && !validRoles.includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role specified");
  }

  // Validate bar council ID for lawyers
  if (role === "lawyer" && barCouncilId) {
    const barCouncilRegex = /^(?:[A-Z]{2})(?:\/[A-Z]{1,2})?\/(?:\d{1,5})\/(?:19|20)\d{2}$/;
    if (!barCouncilRegex.test(barCouncilId)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid Bar Council ID format");
    }
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
    
    // Prepare user data for Firestore based on role
    const baseUserData = {
      uid: uid,
      name: name,
      phoneNumber: phoneNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
      ...(email && {email: email}),
      ...(firstName && {firstName: firstName}),
      ...(lastName && {lastName: lastName})
    };
    
    let userData;
    if (role === "lawyer") {
      // Lawyer profile structure
      userData = {
        ...baseUserData,
        role: "lawyer",
        photo: null,
        barCouncilId: barCouncilId || null,
        qualification: null,
        specialization: null,
        languages: [],
        experience: null,
        bio: null,
        practicingState: null,
        practicingCity: null,
        verificationStatus: "pending",
        availabilityStatus: "offline",
        practiceCourtTier: null,
        enrollmentState: null,
        rating: 0,
        reviewCount: 0,
        totalCasesHandled: 0,
        totalConsultationsCompleted: 0,
        totalEarnings: 0,
        consultationRate: {
          audio: 0,
          video: 0,
          chat: 0,
          perCase: 0
        },
        walletBalance: 0,
        transactionHistory: [],
        withdrawalHistory: [],
        requiredDocuments: {
          barCouncilIdCard: false,
          identityProof: false,
          professionalPhoto: false,
          lawDegreeCertificate: false
        },
        workingHours: null,
        scheduledSessions: [],
        onboardingStatus: "incomplete"
      };
    } else {
      // User/client profile structure
      userData = {
        ...baseUserData,
        role: "user",
        photo: null,
        walletBalance: 0,
        transactionHistory: [],
        activeCases: [],
        caseHistory: [],
        favoriteLawyers: [],
        chatHistory: [],
        totalConsultationsDone: 0,
        totalMoneySpent: 0,
        mostConsultedLawyer: null,
        lastConsultationDate: null,
        onboardingStatus: "complete" // Users don't need KYC
      };
    }
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {role: role || "user"});
    
    // Create or update user document in Firestore
    await admin.firestore().collection("users").doc(uid).set(userData, {merge: true});
    
    // Generate custom token for client-side signInWithCustomToken
    const customToken = await admin.auth().createCustomToken(uid);
    
    return {
      success: true,
      message: `User registered successfully as ${role || "user"}`,
      customToken: customToken,
      role: role || "user",
      uid: uid,
      onboardingRequired: role === "lawyer"
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