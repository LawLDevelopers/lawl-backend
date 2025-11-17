const {admin, functions} = require("../utils/firebase");

const resetPassword = functions.https.onCall(async (data, context) => {
  const {email} = data;
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument");
  }
  const link = await admin.auth().generatePasswordResetLink(email);
  return {link};
});

module.exports = {resetPassword};
