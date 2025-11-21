const {admin, functions} = require("../utils/firebase");

const resendOtp = functions.https.onCall(async (data, context) => {
  const {phoneNumber} = data;
  
  if (!phoneNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  try {
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid phone number format. Use E.164 format (e.g., +1234567890)");
    }
    
    // Log the resend OTP request
    console.log(`Resend OTP request for phone number: ${phoneNumber}`);
    
    // In a production environment, you would integrate with an SMS service here
    // For Firebase phone auth, the actual SMS resending happens on the client-side
    
    return {
      success: true,
      message: "Client should initiate resend OTP flow",
      phoneNumber: phoneNumber
    };
  } catch (error) {
    console.error("Error in resendOtp function:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to process resend OTP request");
  }
});

module.exports = {resendOtp};