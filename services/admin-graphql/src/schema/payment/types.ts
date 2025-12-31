// const { Parking } = require('../models/Parking');
const paymentsTypes = `#graphql
  type paymentSuccess {
    status: Boolean
  }
  type Query {
    checkPaymentDetails: PaymentDetails
  }

  input paymentDetails {
    enabledRazorpay: Boolean
    enabledStripe: Boolean
    razorpayKeyId: String
    razorpayKeySecret: String
    stripeKeyId: String
    stripeKeySecret: String
  }
  type PaymentDetails {
    enabledRazorpay: Boolean
    enabledStripe: Boolean
    razorpayKeyId: String
    razorpayKeySecret: String
    stripeKeyId: String
    stripeKeySecret: String
  }
  type Mutation {
    addPaymentDetails(input: paymentDetails): success
  }
`;

export { paymentsTypes };
