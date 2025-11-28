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

// New User Management functions
exports.createUserDocument = require("./src/auth/createUserDocument").createUserDocument;
exports.getUserData = require("./src/auth/getUserData").getUserData;
exports.updateUserProfileFields = require("./src/auth/updateUserProfileFields").updateUserProfileFields;

// Authentication functions - Lawyer
exports.completeLawyerOnboarding = require("./src/auth/lawyer/completeLawyerOnboarding").completeLawyerOnboarding;
exports.updateLawyerRates = require("./src/auth/lawyer/updateLawyerRates").updateLawyerRates;
exports.searchLawyers = require("./src/auth/lawyer/searchLawyers").searchLawyers;
exports.getLawyerDashboard = require("./src/auth/lawyer/getLawyerDashboard").getLawyerDashboard;

// New Lawyer Management functions
exports.createLawyerDocument = require("./src/auth/lawyer/createLawyerDocument").createLawyerDocument;
exports.getLawyerData = require("./src/auth/lawyer/getLawyerData").getLawyerData;

// Authentication functions - User
exports.assignUserRole = require("./src/auth/user/assignUserRole").assignUserRole;
exports.getUserDashboard = require("./src/auth/user/getUserDashboard").getUserDashboard;
exports.addToFavorites = require("./src/auth/user/addToFavorites").addToFavorites;
exports.removeFromFavorites = require("./src/auth/user/removeFromFavorites").removeFromFavorites;

// Wallet functions
exports.updateWallet = require("./src/wallet/updateWallet").updateWallet;
exports.deductCallCost = require("./src/wallet/deductCallCost").deductCallCost;
exports.getTransactionHistory = require("./src/wallet/getTransactionHistory").getTransactionHistory;

// New Wallet functions
exports.createTransaction = require("./src/wallet/createTransaction").createTransaction;

// Case management functions
exports.createCase = require("./src/cases/createCase").createCase;
exports.updateCaseProgress = require("./src/cases/updateCaseProgress").updateCaseProgress;
exports.getCaseDetails = require("./src/cases/getCaseDetails").getCaseDetails;

// Communication functions
exports.initiateChat = require("./src/communications/initiateChat").initiateChat;
exports.initiateCall = require("./src/communications/initiateCall").initiateCall;

// New Communication functions
exports.sendMessage = require("./src/communications/sendMessage").sendMessage;
exports.getMessages = require("./src/communications/getMessages").getMessages;
exports.uploadFile = require("./src/communications/uploadFile").uploadFile;
exports.initiateAgoraCall = require("./src/communications/initiateAgoraCall").initiateAgoraCall;
exports.sendPushNotification = require("./src/communications/sendPushNotification").sendPushNotification;

// Payment functions
exports.createOrder = require("./src/payments/createOrder").createOrder;
exports.verifyPayment = require("./src/payments/verifyPayment").verifyPayment;
exports.requestWithdrawal = require("./src/payments/requestWithdrawal").requestWithdrawal;
exports.processWithdrawal = require("./src/payments/processWithdrawal").processWithdrawal;
exports.getWithdrawalHistory = require("./src/payments/getWithdrawalHistory").getWithdrawalHistory;
exports.getPendingWithdrawals = require("./src/payments/getPendingWithdrawals").getPendingWithdrawals;

// New Payment functions
exports.createPayout = require("./src/payments/createPayout").createPayout;
exports.getPayoutStatus = require("./src/payments/getPayoutStatus").getPayoutStatus;
exports.validateAccount = require("./src/payments/validateAccount").validateAccount;

// KYC functions
exports.submitKycDocuments = require("./src/kyc/submitKycDocuments").submitKycDocuments;
exports.reviewKyc = require("./src/kyc/reviewKyc").reviewKyc;
exports.getPendingKycSubmissions = require("./src/kyc/getPendingKycSubmissions").getPendingKycSubmissions;

// Metrics functions
exports.getPlatformMetrics = require("./src/metrics/getPlatformMetrics").getPlatformMetrics;
exports.getUserMetrics = require("./src/metrics/getUserMetrics").getUserMetrics;