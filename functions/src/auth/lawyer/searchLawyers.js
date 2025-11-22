const {admin, functions} = require("../../utils/firebase");

const searchLawyers = functions.https.onCall(async (data, context) => {
  // Authentication is optional for searching lawyers
  const {specialization, location, limit = 20} = data;
  
  // At least one search parameter is required
  if (!specialization && !location) {
    throw new functions.https.HttpsError("invalid-argument", "Specialization or location is required");
  }

  try {
    let query = admin.firestore()
      .collection("users")
      .where("role", "==", "lawyer")
      .where("verificationStatus", "==", "verified")
      .limit(limit);
    
    // Add specialization filter if provided
    if (specialization) {
      query = query.where("specialization", "==", specialization);
    }
    
    // Add location filter if provided
    if (location) {
      query = query.where("practicingCity", "==", location);
    }
    
    // Order by rating descending
    query = query.orderBy("rating", "desc");
    
    const lawyersSnapshot = await query.get();
    
    const lawyers = [];
    lawyersSnapshot.forEach(doc => {
      const lawyerData = doc.data();
      lawyers.push({
        id: doc.id,
        name: lawyerData.name,
        firstName: lawyerData.firstName,
        lastName: lawyerData.lastName,
        specialization: lawyerData.specialization,
        practicingCity: lawyerData.practicingCity,
        practicingState: lawyerData.practicingState,
        rating: lawyerData.rating,
        reviewCount: lawyerData.reviewCount,
        experience: lawyerData.experience,
        consultationRate: lawyerData.consultationRate,
        photo: lawyerData.photo,
        bio: lawyerData.bio
      });
    });
    
    return {
      success: true,
      lawyers: lawyers,
      count: lawyers.length
    };
  } catch (error) {
    console.error("Error searching lawyers:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to search lawyers");
  }
});

module.exports = {searchLawyers};