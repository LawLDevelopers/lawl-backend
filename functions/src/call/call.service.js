// functions/src/call/call.service.js
// Service to create and manage call documents in Firestore.

const admin = require('firebase-admin');
if (!admin.apps || !admin.apps.length) {
  try { admin.initializeApp(); } catch (e) { /* already init */ }
}
const db = admin.firestore();

/**
 * Create a call document under collection 'calls'
 * payload: { channelName, callType, creatorUid, participants }
 */
async function createCallDoc({ channelName, callType = 'video', creatorUid, participants = [] }) {
  const callRef = db.collection('calls').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const doc = {
    channelName,
    callType,
    creatorUid,
    participants,
    status: 'initiated',
    createdAt: now,
    updatedAt: now,
  };
  await callRef.set(doc);
  const snap = await callRef.get();
  return { id: callRef.id, data: snap.data() };
}

/**
 * Mark a call as ended
 */
async function endCallDoc(callId) {
  const callRef = db.collection('calls').doc(callId);
  await callRef.update({
    status: 'ended',
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  const snap = await callRef.get();
  return { id: callRef.id, data: snap.data() };
}

/**
 * Optional: fetch call document
 */
async function getCallDoc(callId) {
  const snap = await db.collection('calls').doc(callId).get();
  if (!snap.exists) return null;
  return { id: snap.id, data: snap.data() };
}

module.exports = {
  createCallDoc,
  endCallDoc,
  getCallDoc,
};
