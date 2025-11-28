const {admin, functions} = require("../../utils/firebase");
const {assertSuperAdmin} = require("../../utils/roleUtils");

const createAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated");
  }

  await assertSuperAdmin(context.auth.uid);

  const {email, phoneNumber, password} = data;

  if (!email || !password) {
    throw new functions.https.HttpsError("invalid-argument");
  }

  const user = await admin.auth().createUser({
    email,
    phoneNumber: phoneNumber || undefined,
    password,
  });

  await admin.auth().setCustomUserClaims(user.uid, {role: "admin"});

  await admin.firestore().collection("admins").doc(user.uid).set({
    uid: user.uid,
    email,
    phoneNumber: phoneNumber || null,
    role: "admin",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    uid: user.uid,
    email,
    phoneNumber,
    role: "admin",
  };
});

module.exports = {createAdmin};