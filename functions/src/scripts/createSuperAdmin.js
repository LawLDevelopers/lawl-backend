const admin = require("firebase-admin");
const serviceAccount = require("../../../accountsecret.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function createSuperAdmin() {
  const email = "lawldevelopers@gmail.com";
  const password = "lawldeveloper301004";
  const phoneNumber = "+919320374882";

  const user = await admin.auth().createUser({
    email,
    password,
    phoneNumber,
  });

  await admin.auth().setCustomUserClaims(user.uid, {role: "superadmin"});

  await admin.firestore().collection("admins").doc(user.uid).set({
    uid: user.uid,
    email,
    phoneNumber,
    role: "superadmin",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("Superadmin created:", user.uid);
  process.exit(0);
}

createSuperAdmin();
