const eventTypes = `#graphql
  enum Visibility {
    PUBLIC
    PRIVATE
  }

  enum CommunityEntityStatus {
    APPROVED
    BLOCKED
    PENDING
    REJECTED
    DISABLED
    PAUSED
  }

  enum TimeRange {
    LAST_24_HOURS
    LAST_7_DAYS
    LAST_30_DAYS
    LAST_90_DAYS
    THIS_MONTH
    LAST_MONTH
  }

  input DateRangeInput {
    startDate: String!
    endDate: String!
  }

  # ---------- OBJECT TYPES ----------
  type Location {
    lat: Float
    lng: Float
    name: String
  }

  type EventVerification {
    id: ID!
    eventId: ID!
    isVerified: Boolean!
    verifiedBy: ID
    isVerifiedAt: String
    verificationReason: String
  }

  type Event {
    id: ID!
    title: String!
    slug: String!
    description: String
    cover: String
    entityId: ID!
    status: CommunityEntityStatus
    updatedAt: Date
    createdAt: Date
    startDate: Date
    endDate: Date
    startTime: String
    type: String
    lastDateOfRegistration: Date
    location: Location
    visibility: Visibility
    verification: EventVerification
  }

  type EventStats {
    totalEvents: Int!
    activeEvents: Int!
    totalAttendees: Int!
    totalViews: Int!
    avgAttendees: Float!
    attendeesThisWeek: Int!
    attendeesLastWeek: Int!
    attendeesWeeklyChange: Float!
    viewsThisWeek: Int!
    viewsLastWeek: Int!
    viewsWeeklyChange: Float!
  }

  type RegistrationTrend {
    name: String!
    registrations: Int!
    views: Int!
  }

  type EventTypeDistribution {
    name: String!
    value: Int!
    color: String!
  }

  type AttendeeActivity {
    name: String!
    registered: Int!
    checkedIn: Int!
  }

  type TopPerformingEvent {
    id: ID!
    title: String!
    type: String!
    attendees: Int!
    views: Int!
    status: CommunityEntityStatus!
    cover: String
    date: String!
  }

  type EventSpeaker {
    id: ID!
    eventId: ID!
    name: String!
    email: String
    bio: String
    title: String
    company: String
    avatar: String
    socialLinks: JSON
    isFeatured: Boolean
    displayOrder: Int
    createdAt: String
    status: Boolean
  }

  type EventSponsor {
    id: ID!
    eventId: ID!
    sponsorShipId: ID!
    sponsorName: String!
    sponsorLogo: String!
    sponsorUserName: String!
    sponsorUserDesignation: String!
    isApproved: Boolean!
    createdAt: String
  }

  type EventSponsorship {
    id: ID!
    eventId: ID!
    sponsorType: String!
    price: Float!
    currency: String!
    showPrice: Boolean!
    content: JSON
    createdAt: String
    sponsors: [EventSponsor]
  }

  type EventVenue {
    id: ID!
    eventId: ID!
    name: String!
    address: String!
    city: String!
    state: String
    country: String!
    zipCode: String
    latitude: Float
    longitude: Float
    capacity: Int
    description: String
    amenities: [String]
    contactInfo: JSON
    images: [String]
    createdAt: String
    updatedAt: String
    status: Boolean
  }

  type EventAgenda {
    id: ID!
    eventId: ID!
    title: String!
    videoSteam: String
    venueId: String
    date: String!
    startTime: String!
    endTime: String!
    isPublished: Boolean
    isPinned: Boolean
    isDraft: Boolean
    createdAt: String
    updatedAt: String
    venue: EventVenue
  }

  type EventTicket {
    id: ID!
    eventId: ID!
    name: String!
    type: String!
    price: Float!
    quantity: Int!
    sold: Int!
    description: String
    earlyBirdPrice: Float
    earlyBirdDeadline: String
    maxPerOrder: Int!
    isVisible: Boolean!
    createdAt: String
    updatedAt: String
    status: Boolean
  }

  type EventPromoCode {
    id: ID!
    eventId: ID!
    code: String!
    discountType: String!
    discountValue: Float!
    usageLimit: Int!
    used: Int!
    expiryDate: String!
    applicableTickets: [String]
    createdAt: String
    updatedAt: String
    status: Boolean
  }

  type EventRegistrationSettings {
    id: ID!
    eventId: ID!
    isRegistrationOpen: Boolean!
    enableWaitlist: Boolean!
    requireApproval: Boolean!
    confirmationSubject: String
    confirmationBody: String
    createdAt: String
    updatedAt: String
  }

  type EventRegistrationField {
    id: ID!
    eventId: ID!
    label: String!
    type: String!
    required: Boolean!
    placeholder: String
    options: [String]
    displayOrder: Int!
    createdAt: String
    updatedAt: String
  }

  type EventMedia {
    id: ID!
    eventId: ID!
    url: String
    mediaType: String
    title: String
    tags: [String]
    isPublic: Boolean
    createdAt: String
    updatedAt: String
  }

  type EventSettings {
    id: ID!
    eventId: ID!
    layout: String
    createdAt: String
    updatedAt: String
  }

  type EventAttendee {
    id: ID!
    eventId: ID!
    user: User!
    ticketId: ID
    ticket: EventTicket
    status: String!
    checkedIn: Boolean!
    responses: JSON
    createdAt: String
    updatedAt: String
  }

  type EventDetailStats {
    totalTicketsSold: Int!
    totalRevenue: Float!
    totalAttendees: Int!
    checkInRate: Float!
  }

  type PaginatedEvents {
    events: [Event!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  # ---------- INPUT TYPES ----------
  input LocationInput {
    lat: Float
    lng: Float
    name: String
  }

  input GetAllEventsInput {
    status: CommunityEntityStatus
  }

  input ChangeEventStatusInput {
    action: String!
    reason: String
    eventId: ID!
  }

  input PostEventInput {
    title: String!
    location: JSON
    description: String
    startDate: String
    endDate: String
    startTime: String
    type: String!
    lastDateOfRegistration: String
    coverImage: Upload
    visibility: Visibility
  }

  input EventSpeakerInput {
    eventId: ID!
    name: String!
    email: String
    bio: String
    title: String
    company: String
    avatar: String
    socialLinks: JSON
    isFeatured: Boolean
    displayOrder: Int
  }

  input EventSponsorshipInput {
    eventId: ID!
    sponsorType: String!
    price: Float!
    currency: String!
    showPrice: Boolean
    content: JSON
  }

  input EventSponsorInput {
    eventId: ID!
    sponsorShipId: ID!
    sponsorName: String!
    sponsorLogo: String!
    sponsorUserName: String!
    sponsorUserDesignation: String!
    isApproved: Boolean
  }

  input EventVenueInput {
    eventId: ID!
    name: String!
    address: String!
    city: String!
    state: String
    country: String!
    zipCode: String
    latitude: Float
    longitude: Float
    capacity: Int
    description: String
    amenities: [String]
    contactInfo: JSON
    images: [String]
    status: Boolean
  }

  input EventAgendaInput {
    eventId: ID!
    title: String!
    videoSteam: String
    venueId: String
    date: String!
    startTime: String!
    endTime: String!
    isPublished: Boolean
    isPinned: Boolean
    isDraft: Boolean
  }

  input EventTicketInput {
    eventId: ID!
    name: String!
    type: String!
    price: Float!
    quantity: Int!
    description: String
    earlyBirdPrice: Float
    earlyBirdDeadline: String
    maxPerOrder: Int!
    isVisible: Boolean!
  }

  input EventPromoCodeInput {
    eventId: ID!
    code: String!
    discountType: String!
    discountValue: Float!
    usageLimit: Int!
    expiryDate: String!
    applicableTickets: [String]
  }

  input EventRegistrationSettingsInput {
    eventId: ID!
    isRegistrationOpen: Boolean
    enableWaitlist: Boolean
    requireApproval: Boolean
    confirmationSubject: String
    confirmationBody: String
  }

  input EventRegistrationFieldInput {
    eventId: ID!
    label: String!
    type: String!
    required: Boolean!
    placeholder: String
    options: [String]
    displayOrder: Int
  }

  input EventMediaInput {
    eventId: ID!
    url: String
    mediaType: String
    title: String
    tags: [String]
    isPublic: Boolean
  }

  input EventSettingsInput {
    eventId: ID!
    layout: String
  }

  input AddEventAttendeeInput {
    eventId: ID!
    firstName: String!
    lastName: String!
    email: String!
    ticketId: ID
    status: String
  }

  extend type Query {
    # Get all events with filtering and pagination
    getAllEvents(input: GetAllEventsInput): [Event]

    # Get paginated events
    getEventsPaginated(input: GetAllEventsInput): PaginatedEvents

    # Get single event by ID
    getEventById(id: ID!): Event

    # Get single event by slug
    getEventBySlug(slug: String!): Event

    # Get events statistics
    getEventStats(timeRange: TimeRange, dateRange: DateRangeInput): EventStats

    # Chart data
    getEventRegistrationTrend(timeRange: TimeRange, dateRange: DateRangeInput): [RegistrationTrend]
    getEventTypeDistribution(timeRange: TimeRange, dateRange: DateRangeInput): [EventTypeDistribution]
    getEventAttendeeActivity(timeRange: TimeRange, dateRange: DateRangeInput): [AttendeeActivity]
    getTopPerformingEvents(limit: Int, timeRange: TimeRange, dateRange: DateRangeInput): [TopPerformingEvent]

    # Get events by entity
    getEventsByEntity(entityId: ID!, status: CommunityEntityStatus): [Event]

    # Get upcoming events
    getUpcomingEvents(limit: Int): [Event]

    # Get past events
    getPastEvents(limit: Int): [Event]

    # Search events
    searchEvents(query: String!, limit: Int): [Event]

    # Get events requiring verification
    getEventsForVerification: [Event]

    # Get events by date range
    getEventsByDateRange(startDate: String!, endDate: String!): [Event]

    # Get events by type
    getEventsByType(type: String!, status: CommunityEntityStatus): [Event]

    # Get speakers for an event
    getEventSpeakers(eventId: ID!): [EventSpeaker]

    # Get Sponsorships for an event
    getEventSponsorships(eventId: ID!): [EventSponsorship]
    getEventSponsors(eventId: ID!): [EventSponsor]

    # Get Venues for an event
    getEventVenues(eventId: ID!): [EventVenue]

    # Get Agendas for an event
    getEventAgendas(eventId: ID!): [EventAgenda]

    # Tickets & Promo Codes
    getEventTickets(eventId: ID!): [EventTicket]
    getEventPromoCodes(eventId: ID!): [EventPromoCode]

    # Registration
    getEventRegistrationSettings(eventId: ID!): EventRegistrationSettings
    getEventRegistrationFields(eventId: ID!): [EventRegistrationField]

    # Media
    getEventMedia(eventId: ID!): [EventMedia]

    # Settings
    getEventSettings(eventId: ID!): EventSettings

    # Attendees
    getEventAttendees(eventId: ID!): [EventAttendee]

    # Analytics
    getEventDetailStats(eventId: ID!): EventDetailStats
  }

  extend type Mutation {
    addEvent(input: PostEventInput): Event

    changeEventStatus(input: ChangeEventStatusInput!): Event

    changeEventVerification(
      eventId: ID!
      isVerified: Boolean!
      verificationReason: String
    ): Event

    # Bulk operations
    bulkChangeEventStatus(
      eventIds: [ID!]!
      status: CommunityEntityStatus!
      reason: String
    ): [Event]

    # Delete event
    deleteEvent(eventId: ID!): Boolean

    # Update event
    updateEvent(eventId: ID!, input: PostEventInput!): Event

    # Speakers
    addEventSpeaker(input: EventSpeakerInput!): EventSpeaker
    updateEventSpeaker(speakerId: ID!, input: EventSpeakerInput!): EventSpeaker
    deleteEventSpeaker(speakerId: ID!): Boolean
    toggleSpeakerFeatured(speakerId: ID!, isFeatured: Boolean!): EventSpeaker

    # Sponsorship Tiers
    addEventSponsorship(input: EventSponsorshipInput!): EventSponsorship
    updateEventSponsorship(sponsorshipId: ID!, input: EventSponsorshipInput!): EventSponsorship
    deleteEventSponsorship(sponsorshipId: ID!): Boolean

    # Sponsors
    addEventSponsor(input: EventSponsorInput!): EventSponsor
    updateEventSponsor(sponsorId: ID!, input: EventSponsorInput!): EventSponsor
    deleteEventSponsor(sponsorId: ID!): Boolean

    # Venues
    addEventVenue(input: EventVenueInput!): EventVenue
    updateEventVenue(venueId: ID!, input: EventVenueInput!): EventVenue
    deleteEventVenue(venueId: ID!): Boolean

    # Agendas
    addEventAgenda(input: EventAgendaInput!): EventAgenda
    updateEventAgenda(agendaId: ID!, input: EventAgendaInput!): EventAgenda
    deleteEventAgenda(agendaId: ID!): Boolean

    # Tickets
    addEventTicket(input: EventTicketInput!): EventTicket
    updateEventTicket(ticketId: ID!, input: EventTicketInput!): EventTicket
    deleteEventTicket(ticketId: ID!): Boolean

    # Promo Codes
    addEventPromoCode(input: EventPromoCodeInput!): EventPromoCode
    updateEventPromoCode(promoCodeId: ID!, input: EventPromoCodeInput!): EventPromoCode
    deleteEventPromoCode(promoCodeId: ID!): Boolean

    # Registration Settings
    upsertEventRegistrationSettings(input: EventRegistrationSettingsInput!): EventRegistrationSettings

    # Registration Fields
    addEventRegistrationField(input: EventRegistrationFieldInput!): EventRegistrationField
    updateEventRegistrationField(fieldId: ID!, input: EventRegistrationFieldInput!): EventRegistrationField
    deleteEventRegistrationField(fieldId: ID!): Boolean

    # Media
    addEventMedia(input: EventMediaInput!): EventMedia
    updateEventMedia(mediaId: ID!, input: EventMediaInput!): EventMedia
    deleteEventMedia(mediaId: ID!): Boolean
    updateEventMediaVisibility(mediaId: ID!, isPublic: Boolean!): EventMedia

    # Settings
    upsertEventSettings(input: EventSettingsInput!): EventSettings

    # Attendees
    addEventAttendee(input: AddEventAttendeeInput!): EventAttendee
    updateAttendeeStatus(attendeeId: ID!, status: String!): EventAttendee
    toggleAttendeeCheckIn(attendeeId: ID!): EventAttendee
  }
`;

export { eventTypes };
