// functions/tests/agora-call-test.js
// Usage:
// node tests/agora-call-test.js <baseUrl> <creatorUid>
// Example:
// node tests/agora-call-test.js http://localhost:5001/YOUR_PROJECT/us-central1  uid123

const axios = require('axios');

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node tests/agora-call-test.js <baseUrl> <creatorUid>');
    process.exit(1);
  }
  const [baseUrl, creatorUid] = args;
  try {
    // 1) Create call
    const createResp = await axios.post(`${baseUrl}/createCall`, {
      creatorUid,
      participants: [],
      callType: 'video'
    });
    console.log('createCall:', createResp.data);
    const callId = createResp.data.callId;
    const channelName = createResp.data.call.channelName;

    // 2) Request token for creator (getAgoraToken endpoint)
    const cleanedBase = baseUrl.replace('/createCall', '');
    const tokenResp = await axios.post(`${cleanedBase}/getAgoraToken`, {
      channelName,
      uid: creatorUid
    }).catch(async err => {
      // fallback: endpoint placement may differ; try direct path
      return axios.post(`${baseUrl}/getAgoraToken`, { channelName, uid: creatorUid });
    });

    console.log('getAgoraToken:', tokenResp.data);

    // 3) End call
    const endResp = await axios.post(`${baseUrl}/endCall`, { callId });
    console.log('endCall:', endResp.data);

  } catch (err) {
    console.error('Test error:', err.response ? err.response.data : err.message);
  }
}

run();
