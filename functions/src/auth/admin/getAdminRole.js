const {admin, functions} = require("../../utils/firebase");

const getAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated");

  const user = await admin.auth().getUser(context.auth.uid);
  return {role: user.customClaims?.role || null};
});

module.exports = {getAdminRole};