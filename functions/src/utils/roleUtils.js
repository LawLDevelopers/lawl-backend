const {admin, functions} = require("./firebase");

async function assertSuperAdmin(uid) {
  const user = await admin.auth().getUser(uid);
  const role = user.customClaims?.role;

  if (role !== "superadmin") {
    throw new functions.https.HttpsError(
        "permission-denied",
        "Only superadmins can perform this action",
    );
  }
}

module.exports = {assertSuperAdmin};
