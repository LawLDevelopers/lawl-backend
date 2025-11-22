// Authentication functions
exports.createAdmin = require("./src/auth/createAdmin").createAdmin;
exports.resetPassword = require("./src/auth/resetPassword").resetPassword;
exports.getAdminRole = require("./src/auth/getAdminRole").getAdminRole;
exports.getUserRole = require("./src/auth/getUserRole").getUserRole;
exports.sendOtp = require("./src/auth/sendOtp").sendOtp;
exports.verifyOtp = require("./src/auth/verifyOtp").verifyOtp;
exports.assignUserRole = require("./src/auth/assignUserRole").assignUserRole;
exports.checkOnboardingStatus = require("./src/auth/checkOnboardingStatus").checkOnboardingStatus;
exports.registerUser = require("./src/auth/registerUser").registerUser;
exports.completeSignup = require("./src/auth/completeSignup").completeSignup;
exports.updateUserProfile = require("./src/auth/updateUserProfile").updateUserProfile;
exports.resendOtp = require("./src/auth/resendOtp").resendOtp;
exports.completeLawyerOnboarding = require("./src/auth/completeLawyerOnboarding").completeLawyerOnboarding;
exports.updateLawyerVerification = require("./src/auth/updateLawyerVerification").updateLawyerVerification;
exports.updateLawyerRates = require("./src/auth/updateLawyerRates").updateLawyerRates;

// Wallet functions
exports.updateWallet = require("./src/wallet/updateWallet").updateWallet;
exports.deductCallCost = require("./src/wallet/deductCallCost").deductCallCost;

// Case management functions
exports.createCase = require("./src/cases/createCase").createCase;
exports.updateCaseProgress = require("./src/cases/updateCaseProgress").updateCaseProgress;
exports.getCaseDetails = require("./src/cases/getCaseDetails").getCaseDetails;

// Communication functions
exports.initiateChat = require("./src/communications/initiateChat").initiateChat;
exports.initiateCall = require("./src/communications/initiateCall").initiateCall;

// Metrics functions
exports.getPlatformMetrics = require("./src/metrics/getPlatformMetrics").getPlatformMetrics;