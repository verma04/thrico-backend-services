export const mentorshipTypes = `#graphql
  scalar Upload
  scalar Date

  type mentorShip {
    id: ID
    isApproved: Boolean
    isRequested: Boolean
    displayName: String
    slug: String
  }

  type PaymentResponse {
    id: String
    entity: String
    amount: String
    amount_paid: String
    amount_due: Int
    currency: String
    receipt: String
    status: String
    attempts: String
    created_at: Date
    payment: Boolean
    key_id: String
  }
  type Testimonial {
    id: ID
    testimonial: String
    from: String
  }
  type Mentor {
    displayName: String
    about: String
    id: String
    slug: String
    user: MentorUser
  }
  type Alumni {
    firstName: String
    lastName: String
  }
  type MentorUser {
    user: Alumni
  }

  type Services {
    id: ID
    serviceType: String
    priceType: String
    title: String
    duration: Int
    price: Int
    shortDescription: String
    description: String
    webinarUrl: String
    mentorship: Mentor
    webinarDate: Date
    booking: IsBooking
  }
  type IsBooking {
    isBooking: Boolean
    createdAt: Date
  }
  input InputAddServices {
    serviceType: String!
    priceType: String!
    title: String!
    duration: Int!
    price: Int
    shortDescription: String!
    description: String
    webinarUrl: String
    webinarDate: Date
  }
  input InputPaymentDetails {
    razorpay_order_id: String!
    razorpay_payment_id: String!
    razorpay_signature: String!
    serviceID: ID!
  }

  input InputFreeBookingDetails {
    serviceID: ID!
  }

  type MentorCategory {
    id: ID
    title: String
    count: Int
  }

  type MentorSkills {
    id: ID
    title: String
    count: Int
  }
  type Currency {
    symbol: String
    cc: String
  }
  type Booking {
    id: ID
    user: MentorUser
    service: Services
    createdAt: Date
  }
  
  input CheckUrl {
    url: String
  }
  input RegisterMentorShipInput {
    about: String!
    category: String!
    displayName: String!
    featuredArticle: String
    greatestAchievement: String
    intro: String
    introVideo: String!
    whyDoWantBecomeMentor: String
    agreement: Boolean!
    skills: [String]
  }
  input RegisterTestimonialInput {
    testimonial: String!
    from: String!
  }
  input InputAcceptBookingRequest {
    bookingID: ID!
    url: String!
  }

  input InputCancelBooking {
    bookingID: ID!
  }
  input InputCompletedBooking {
    bookingID: ID!
  }

  extend type Query {
    getMentorProfileBySlug(input: inputId): Mentor
    getAllMentorServicesByID(input: inputId): [Services]
    getAllApprovedMentor: [Mentor]
    getAllMentorServices: [Services]
    getAllMentorTestimonial: [Testimonial]
    getCurrency: Currency
    getAllMentorCategory: [MentorCategory]
    getAllMentorSkills: [MentorSkills]
    checkMentorShip: mentorShip
    checkMentorShipUrl(input: CheckUrl): success
    checkWebinarPaymentResponse(input: inputId): PaymentResponse
    getServicesDetails(input: inputId!): Services
    getBookingRequest: [Booking]
    getUpcomingBooking: [Booking]
    getCancelledBooking: [Booking]
    getCompletedBooking: [Booking]
  }

  extend type Mutation {
    addMentorShipTestimonials(input: RegisterTestimonialInput): [Testimonial]
    registerMentorShip(input: RegisterMentorShipInput): success
    addMentorShipServices(input: InputAddServices): [Services]
    duplicateMentorShipServices(input: inputId): [Services]
    duplicateMentorShipTestimonials(input: inputId): [Testimonial]
    bookPaidWebinar(input: InputPaymentDetails): success
    bookFreeWebinar(input: InputFreeBookingDetails): success
    acceptBookingRequest(input: InputAcceptBookingRequest): Booking
    cancelBooking(input: InputCancelBooking): Booking
    markBookingAsCompleted(input: InputCompletedBooking): Booking
  }
`;
