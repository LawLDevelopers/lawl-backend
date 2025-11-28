// functions/src/agora/agora.service.js

const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const { defineSecret } = require("firebase-functions/params");

// Define Firebase Secrets
const AGORA_APP_ID = defineSecret("AGORA_APP_ID");
const AGORA_APP_CERT = defineSecret("AGORA_APP_CERT");

/**
 * Builds a token using Agora's Access Token Builder
 */
function generateRtcToken({ channelName, uid, role = RtcRole.PUBLISHER, ttl = 3600 }) {
  const APP_ID = AGORA_APP_ID.value();
  const APP_CERT = AGORA_APP_CERT.value();

  if (!APP_ID || !APP_CERT) {
    throw new Error(
      "Missing Agora credentials. Set them using:\n" +
      "firebase functions:secrets:set AGORA_APP_ID\n" +
      "firebase functions:secrets:set AGORA_APP_CERT"
    );
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const expireTimestamp = currentTimestamp + ttl;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERT,
    channelName,
    Number(uid),
    role,
    expireTimestamp
  );

  return {
    token,
    expireTimestamp,
    appId: APP_ID,
  };
}

module.exports = {
  generateRtcToken,
  RtcRole,
  AGORA_APP_ID,
  AGORA_APP_CERT
};
