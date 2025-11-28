// functions/src/agora/agora.controller.js

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const {
  generateRtcToken,
  AGORA_APP_ID,
  AGORA_APP_CERT
} = require("./agora.service");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.getAgoraToken = onRequest(
  { secrets: [AGORA_APP_ID, AGORA_APP_CERT] },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Only POST method allowed" });
      }

      const { channelName, uid, ttl } = req.body;

      if (!channelName) {
        return res.status(400).json({ error: "channelName is required" });
      }

      const userId = uid || "user_" + Math.random().toString(36).slice(2, 10);

      const tokenData = generateRtcToken({
        channelName,
        uid: userId,
        ttl: ttl || 3600
      });

      return res.json({
        success: true,
        channelName,
        uid: userId,
        appId: tokenData.appId,
        expireAt: tokenData.expireTimestamp,
        token: tokenData.token
      });

    } catch (err) {
      console.error("getAgoraToken ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }
);
