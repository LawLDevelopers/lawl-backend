const {admin, functions} = require("../utils/firebase");

const completeLawyerOnboarding = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {
    firstName,
    lastName,
    qualification,
    specialization,
    languages,
    experience,
    bio,
    practicingState,
    practicingCity,
    practiceCourtTier,
    enrollmentState,
    barCouncilId,
    photo
  } = data;

  try {
    const uid = context.auth.uid;
    
    // Verify user is a lawyer
    const user = await admin.auth().getUser(uid);
    const role = user.customClaims?.role;
    
    if (role !== "lawyer") {
      throw new functions.https.HttpsError("permission-denied", "Only lawyers can complete onboarding");
    }
    
    // Prepare update data
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingStatus: "completed",
      verificationStatus: "pending", // Will need admin approval
      availabilityStatus: "online",
      ...(firstName && {firstName}),
      ...(lastName && {lastName}),
      ...(qualification && {qualification}),
      ...(specialization && {specialization}),
      ...(languages && {languages}),
      ...(experience && {experience}),
      ...(bio && {bio}),
      ...(practicingState && {practicingState}),
      ...(practicingCity && {practicingCity}),
      ...(practiceCourtTier && {practiceCourtTier}),
      ...(enrollmentState && {enrollmentState}),
      ...(barCouncilId && {barCouncilId}),
      ...(photo && {photo})
    };
    
    // Update user document in Firestore
    await admin.firestore().collection("users").doc(uid).update(updateData);
    
    return {
      success: true,
      message: "Lawyer onboarding completed successfully",
      onboardingStatus: "completed",
      verificationStatus: "pending"
    };
  } catch (error) {
    console.error("Error completing lawyer onboarding:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to complete lawyer onboarding");
  }
});

module.exports = {completeLawyerOnboarding};