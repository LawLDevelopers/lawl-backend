// functions/index.js

// AUTH V2 HANDLERS
exports.createAdmin = require("./src/auth/createAdmin");
exports.resetPassword = require("./src/auth/resetPassword");
exports.getAdminRole = require("./src/auth/getAdminRole");
exports.getUserRole = require("./src/auth/getUserRole");
exports.sendOtp = require("./src/auth/sendOtp");
exports.verifyOtp = require("./src/auth/verifyOtp");
exports.assignUserRole = require("./src/auth/assignUserRole");
exports.checkOnboardingStatus = require("./src/auth/checkOnboardingStatus");
exports.registerUser = require("./src/auth/registerUser");
exports.completeSignup = require("./src/auth/completeSignup");
exports.updateUserProfile = require("./src/auth/updateUserProfile");
exports.resendOtp = require("./src/auth/resendOtp");

// AGORA
exports.getAgoraToken = require("./src/agora/agora.controller").getAgoraToken;

// CALL
exports.createCall = require("./src/call/call.controller").createCall;
exports.endCall = require("./src/call/call.controller").endCall;
exports.getCall = require("./src/call/call.controller").getCall;

exports.initiateCall = require("./src/call/call.actions.controller").initiateCall;
exports.acceptCall = require("./src/call/call.actions.controller").acceptCall;
exports.rejectCall = require("./src/call/call.actions.controller").rejectCall;
exports.switchCallType = require("./src/call/call.actions.controller").switchCallType;
exports.markBusy = require("./src/call/call.actions.controller").markBusy;
exports.markMissed = require("./src/call/call.actions.controller").markMissed;
