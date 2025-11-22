const {admin, functions} = require("../../utils/firebase");

const createLawyerDocument = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {lawyerId, lawyerData} = data;
  
  // Validate required fields
  if (!lawyerId || !lawyerData) {
    throw new functions.https.HttpsError("invalid-argument", "Lawyer ID and lawyer data are required");
  }

  try {
    // Only allow admins to create lawyer documents for others
    if (context.auth.uid !== lawyerId) {
      // Check if user is admin
      const adminDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Admin user not found");
      }
      
      const adminData = adminDoc.data();
      if (adminData.role !== "admin") {
        throw new functions.https.HttpsError("permission-denied", "Only admins can create lawyer documents for others");
      }
    }
    
    // Prepare lawyer document with proper structure
    const lawyerDocument = {
      id: lawyerId,
      name: lawyerData.name || "",
      email: lawyerData.email || "",
      phone: lawyerData.phone || "",
      imageUrl: lawyerData.imageUrl || "",
      specialization: lawyerData.specialization || [],
      languages: lawyerData.languages || [],
      qualification: lawyerData.qualification || "",
      experience: lawyerData.experience || 0,
      rating: lawyerData.rating || 0.0,
      reviewCount: lawyerData.reviewCount || 0,
      totalCases: lawyerData.totalCases || 0,
      wonCases: lawyerData.wonCases || 0,
      status: lawyerData.status || "pending",
      about: lawyerData.about || "",
      fees: lawyerData.fees || {},
      availability: lawyerData.availability || {},
      isAvailable: lawyerData.isAvailable || true,
      barCouncilId: lawyerData.barCouncilId || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...lawyerData // Include any additional fields
    };
    
    // Create or update lawyer document
    await admin.firestore().collection("lawyers").doc(lawyerId).set(lawyerDocument, {merge: true});
    
    // Also update user document to set role as lawyer
    await admin.firestore().collection("users").doc(lawyerId).update({
      role: "lawyer",
      isLawyer: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: "Lawyer document created/updated successfully"
    };
  } catch (error) {
    console.error("Error creating lawyer document:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create lawyer document");
  }
});

module.exports = {createLawyerDocument};