// functions/src/call/call.actions.controller.js

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const addCors = require("../utils/cors");

if (!admin.apps.length) admin.initializeApp();

const {
  createRingingCall,
  updateCall,
  getCall
} = require("./call.actions.service");

// =============== initiateCall ===================
exports.initiateCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callerUid, receiverUid, callType = "audio", channelName } = req.body || {};
    if (!callerUid || !receiverUid) {
return res.status(400).json({ error: "callerUid and receiverUid are required" });
}

    const ch = channelName || `call_${Math.random().toString(36).slice(2, 9)}`;

    const created = await createRingingCall({
      channelName: ch,
      callType,
      callerUid,
      receiverUid,
      participants: [callerUid, receiverUid]
    });

    return res.json({ success: true, callId: created.id, call: created.data });
  } catch (err) {
    console.error("initiateCall error", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============== acceptCall ===================
exports.acceptCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callId, accepterUid } = req.body || {};
    if (!callId || !accepterUid) {
return res.status(400).json({ error: "callId and accepterUid required" });
}

    const existing = await getCall(callId);
    if (!existing) {
return res.status(404).json({ error: "Call not found" });
}

    if (
      existing.data.receiverUid !== accepterUid &&
      existing.data.callerUid !== accepterUid
    ) {
      return res.status(403).json({ error: "Only caller/receiver can accept" });
    }

    const updated = await updateCall(callId, {
      status: "ongoing",
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ success: true, callId: updated.id, call: updated.data });
  } catch (err) {
    console.error("acceptCall error", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============== rejectCall ===================
exports.rejectCall = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callId, rejecterUid, reason } = req.body || {};
    if (!callId || !rejecterUid) {
return res.status(400).json({ error: "callId and rejecterUid required" });
}

    const existing = await getCall(callId);
    if (!existing) {
return res.status(404).json({ error: "Call not found" });
}

    const updated = await updateCall(callId, {
      status: "rejected",
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      rejecterUid,
      rejectReason: reason || null
    });

    return res.json({ success: true, callId: updated.id, call: updated.data });
  } catch (err) {
    console.error("rejectCall error", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============== switchCallType ===================
exports.switchCallType = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callId, callType } = req.body || {};
    if (!callId || !callType) {
return res.status(400).json({ error: "callId and callType required" });
}

    if (!["audio", "video"].includes(callType)) {
return res.status(400).json({ error: "callType must be 'audio' or 'video'" });
}

    const existing = await getCall(callId);
    if (!existing) {
return res.status(404).json({ error: "Call not found" });
}

    const updated = await updateCall(callId, {
      callType,
      callTypeChangedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ success: true, callId: updated.id, call: updated.data });
  } catch (err) {
    console.error("switchCallType error", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============== markBusy ===================
exports.markBusy = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callId, userUid } = req.body || {};
    if (!callId || !userUid) {
return res.status(400).json({ error: "callId and userUid required" });
}

    const updated = await updateCall(callId, {
      status: "busy",
      busyBy: userUid,
      busyAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ success: true, callId: updated.id, call: updated.data });
  } catch (err) {
    console.error("markBusy error", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============== markMissed ===================
exports.markMissed = onRequest(async (req, res) => {
  if (addCors(req, res)) return;

  try {
    if (req.method !== "POST") {
return res.status(405).json({ error: "Only POST allowed" });
}

    const { callId, userUid } = req.body || {};
    if (!callId || !userUid) {
return res.status(400).json({ error: "callId and userUid required" });
}

    const updated = await updateCall(callId, {
      status: "missed",
      missedBy: userUid,
      missedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ success: true, callId: updated.id, call: updated.data });
  } catch (err) {
    console.error("markMissed error", err);
    return res.status(500).json({ error: err.message });
  }
});
