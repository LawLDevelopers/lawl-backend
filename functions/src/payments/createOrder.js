const {admin, functions} = require("../utils/firebase");
const Razorpay = require('razorpay');

// Initialize Razorpay with your credentials
// Note: In production, use environment variables
let razorpay;
try {
  const key_id = functions.config().razorpay?.key_id;
  const key_secret = functions.config().razorpay?.key_secret;
  
  if (key_id && key_secret) {
    razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret
    });
  } else {
    console.warn("Razorpay credentials not configured. Payments will not work.");
    razorpay = null;
  }
} catch (error) {
  console.warn("Error initializing Razorpay:", error.message);
  razorpay = null;
}

const createOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if Razorpay is properly configured
  if (!razorpay) {
    throw new functions.https.HttpsError("failed-precondition", "Payment system not configured");
  }

  const {amount, currency = 'INR'} = data;
  
  // Validate required fields
  if (!amount) {
    throw new functions.https.HttpsError("invalid-argument", "Amount is required");
  }

  // Validate amount
  if (typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Amount must be a positive number");
  }

  try {
    const userId = context.auth.uid;
    
    // Create order options
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: `receipt_order_${userId}_${Date.now()}`,
      payment_capture: 1 // Auto-capture payment
    };
    
    // Create order in Razorpay
    const order = await razorpay.orders.create(options);
    
    // Store order details in Firestore
    const orderData = {
      orderId: order.id,
      amount: amount,
      currency: currency,
      status: 'created',
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await admin.firestore().collection("payments").doc(order.id).set(orderData);
    
    return {
      success: true,
      message: "Order created successfully",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    if (error.code) {
      // Re-throw Firebase errors
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to create payment order");
  }
});

module.exports = {createOrder};