// functions/src/call/call.actions.service.js
const admin = require("firebase-admin");
if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

/**
 * Create or update call doc helper functions used by controllers.
 */

async function createRingingCall({
  channelName,
  callType = "audio", // audio | video
  callerUid,
  receiverUid,
  participants = []
}) {
  const callRef = db.collection("calls").doc();
  const now = FieldValue.serverTimestamp();

  const doc = {
    channelName,
    callType,
    callerUid,
    receiverUid,
    participants,
    status: "ringing",
    createdAt: now,
    updatedAt: now,
    // will be helpful to auto-mark missed later
    ringStartedAt: now
  };

  await callRef.set(doc);
  const snap = await callRef.get();
  return { id: callRef.id, data: snap.data() };
}

async function updateCall(callId, patch = {}) {
  const callRef = db.collection("calls").doc(callId);
  patch.updatedAt = FieldValue.serverTimestamp();
  await callRef.set(patch, { merge: true });
  const snap = await callRef.get();
  return { id: callRef.id, data: snap.data() };
}

async function getCall(callId) {
  const snap = await db.collection("calls").doc(callId).get();
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() };
}

module.exports = {
  createRingingCall,
  updateCall,
  getCall
};
