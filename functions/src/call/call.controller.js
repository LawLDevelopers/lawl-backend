const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const addCors = require("../utils/cors"); // <--- ADD THIS

const { createCallDoc, endCallDoc, getCallDoc } = require("./call.service");

if (!admin.apps.length) admin.initializeApp();

// ========================= CREATE CALL =========================
exports.createCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return; // <--- ENABLE CORS

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { creatorUid, participants, callType, channelName } = req.body || {};
    if (!creatorUid) {
      return res.status(400).json({ error: "creatorUid is required" });
    }

    const channel = channelName || `call_${Math.random().toString(36).slice(2, 9)}`;

    const result = await createCallDoc({
      channelName: channel,
      callType: callType || "video",
      creatorUid,
      participants: participants || [],
    });

    return res.json({ success: true, callId: result.id, call: result.data });
  } catch (err) {
    console.error("createCall error", err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================= END CALL =========================
exports.endCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return; // <--- ENABLE CORS

  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { callId } = req.body || {};
    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    const result = await endCallDoc(callId);
    return res.json({ success: true, callId: result.id, call: result.data });
  } catch (err) {
    console.error("endCall error", err);
    return res.status(500).json({ error: err.message });
  }
});

// ========================= GET CALL =========================
exports.getCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return; // <--- ENABLE CORS

  try {
    const callId = req.query.callId;
    if (!callId) {
      return res.status(400).json({ error: "callId is required" });
    }

    const result = await getCallDoc(callId);
    if (!result) {
      return res.status(404).json({ error: "Call not found" });
    }

    return res.json({ success: true, callId: result.id, call: result.data });
  } catch (err) {
    console.error("getCall error", err);
    return res.status(500).json({ error: err.message });
  }
});
