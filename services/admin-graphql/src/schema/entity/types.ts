export const entityTypes = `#graphql
  scalar Upload

  type Book {
    title: String
    author: String
  }

  type Success {
    success: Boolean
  }

  type Currency {
    id: ID
    name: String
    symbol: String
    cc: String
  }

  type Token {
    id: ID
  }

  type JwtToken {
    token: String
  }

  input RegisterEntityInput {
    name: String!
    entityType: ID!
    industryType: ID!
    designation: String!
    website: String!
    country: String!
    language: String!
    address: String!
    logo: Upload
    domain: String!
    phone: JSON!
    agreement: Boolean
  }

  input DomainQuery {
    domain: String!
  }

  input ChangeEntityDomainInput {
    domain: String!
  }

  type EntityType {
    title: String
    id: ID
  }

  type Entity {
    name: String
    id: ID
    logo: String
    subscription: Subscription
  }

  type Settings {
    id: ID
    entity: ID

    # User Management
    allowNewUser: Boolean
    autoApproveUser: Boolean

    # Communities
    allowCommunity: Boolean
    autoApproveCommunity: Boolean
    autoApproveGroup: Boolean

    # Forums
    allowDiscussionForum: Boolean
    autoApproveDiscussionForum: Boolean

    # Events
    allowEvents: Boolean
    autoApproveEvents: Boolean

    # Jobs
    allowJobs: Boolean
    autoApproveJobs: Boolean

    # Mentorship
    allowMentorship: Boolean
    autoApproveMentorship: Boolean

    # Listing
    allowListing: Boolean
    autoApproveListing: Boolean
    autoApproveMarketPlace: Boolean

    # Shop
    allowShop: Boolean
    autoApproveShop: Boolean

    # Offers
    allowOffers: Boolean
    autoApproveOffers: Boolean

    # Surveys
    allowSurveys: Boolean
    autoApproveSurveys: Boolean

    # Polls
    allowPolls: Boolean
    autoApprovePolls: Boolean

    # Stories
    allowStories: Boolean
    autoApproveStories: Boolean

   
  }

  type ModuleFaq {
    module: String!
    faq: JSON
  }

  type ModuleTermsAndConditions {
    module: String!
    termsAndConditions: JSON
  }

  input ModuleInput {
    module: String!
  }

  type TermAndConditions {
    termAndConditionsCommunities: JSON
    termAndConditionsMembers: JSON
    termAndDiscussionForum: JSON
  }

  input InputMemberTermsAndConditions {
    termAndConditionsMembers: JSON
  }

  input InputDiscussionForumTermsAndConditions {
    termAndDiscussionForums: JSON
  }

  input EntityAutoApprovalSettingsInput {
    # User Management
    allowNewUser: Boolean
    autoApproveUser: Boolean
    termAndConditionsMembers: JSON
    faqMembers: JSON

    # Communities
    allowCommunity: Boolean
    autoApproveCommunity: Boolean
    autoApproveGroup: Boolean
    termAndConditionsCommunities: JSON
    faqCommunities: JSON

    # Forums
    allowDiscussionForum: Boolean
    autoApproveDiscussionForum: Boolean
    termAndConditionsForums: JSON
    faqForums: JSON

    # Events
    allowEvents: Boolean
    autoApproveEvents: Boolean
    termAndConditionsEvents: JSON
    faqEvents: JSON

    # Jobs
    allowJobs: Boolean
    autoApproveJobs: Boolean
    termAndConditionsJobs: JSON
    faqJobs: JSON

    # Mentorship
    allowMentorship: Boolean
    autoApproveMentorship: Boolean
    termAndConditionsMentorship: JSON
    faqMentorship: JSON

    # Listing
    allowListing: Boolean
    autoApproveListing: Boolean
    autoApproveMarketPlace: Boolean
    termAndConditionsListing: JSON
    faqListing: JSON

    # Shop
    allowShop: Boolean
    autoApproveShop: Boolean
    termAndConditionsShop: JSON
    faqShop: JSON

    # Offers
    allowOffers: Boolean
    autoApproveOffers: Boolean
    termAndConditionsOffers: JSON
    faqOffers: JSON

    # Surveys
    allowSurveys: Boolean
    autoApproveSurveys: Boolean
    termAndConditionsSurveys: JSON
    faqSurveys: JSON

    # Polls
    allowPolls: Boolean
    autoApprovePolls: Boolean
    termAndConditionsPolls: JSON
    faqPolls: JSON

    # Stories
    allowStories: Boolean
    autoApproveStories: Boolean
    termAndConditionsStories: JSON
    faqStories: JSON

    # Wall of Fame
  
    termAndConditionsWallOfFame: JSON
    faqWallOfFame: JSON

    # Gamification
  
    termAndConditionsGamification: JSON
    faqGamification: JSON
  }


  type ButtonTheme {
    colorPrimary: String
    colorText: String
    colorBorder: String
    borderRadius: Int
    defaultBg: String
    defaultColor: String
    defaultBorderColor: String
    fontSize: Int
  }

  type EntityAppearanceTheme {
    primaryColor: String
    secondaryColor: String
    backgroundColor: String
    textColor: String
    buttonColor: String
    borderRadius: Int
    borderWidth: Int
    borderStyle: String
    borderColor: String
    inputBackground: String
    inputBorderColor: String
    fontSize: Int
    fontWeight: String
    boxShadow: String
    hoverEffect: String
    Button: ButtonTheme
  }

  input ButtonThemeInput {
    colorPrimary: String
    colorText: String
    colorBorder: String
    borderRadius: Int
    defaultBg: String
    defaultColor: String
    defaultBorderColor: String
    fontSize: Int
  }

  input EditEntityTheme {
    primaryColor: String
    secondaryColor: String
    backgroundColor: String
    textColor: String
    buttonColor: String
    borderRadius: Int
    borderWidth: Int
    borderStyle: String
    borderColor: String
    inputBackground: String
    inputBorderColor: String
    fontSize: Int
    fontWeight: String
    boxShadow: String
    hoverEffect: String
    Button: ButtonThemeInput
  }

  type Countries {
    code: String
    name: String
  }

  # Resolving conflict with main typeDefs Subscription type if necessary,
  # or assuming this extends/replaces it.
  # For now, I will use a different name or keep it consistent with the user Request.
  # The user provided type subscription.

  # Note: Capitalized Subscription for GraphQL convention
  # (though user provided lowercase "subscription")
  # However, typeDefs already has Subscription defined.
  # I will rename this to EntitySubscriptionDetails to avoid conflict
  # and align with best practices, or merge if intended.
  # Given the context, this looks like a specific object type, NOT the Subscription root type.

  type EntitySubscriptionDetails {
    subscriptionId: String
    packageId: String
    planName: String
    planType: String
    billingCycle: String
    startDate: String
    endDate: String
    status: Boolean
    subscriptionType: String
    graceUntil: String
    modules: [SubscriptionModule]
  }

  type SubscriptionModule {
    id: ID
    name: String
    icon: String
    showInMobileNavigation: Boolean
    showInWebNavigation: Boolean
    enabled: Boolean
    isPopular: Boolean
    showInMobileNavigationSortNumber: Int
  }

  type EntityTheme {
    colorPrimary: String
    borderRadius: String
    colorBgContainer: String
  }

  type InputTheme {
    colorPrimary: String
    borderRadius: String
    colorBgContainer: String
  }

  input InputThemeInput {
    colorPrimary: String
    borderRadius: Int
    colorBgContainer: String
  }

  input InputCurrency {
    id: ID
  }

  type UploadEntityLogoResponse {
    id: ID
    name: String
    logo: String
    success: Boolean
    message: String
  }

  input UpdateEntityInput {
    name: String
  }

  type UpdateEntityProfileResponse {
    id: ID
    name: String
    logo: String
    success: Boolean
    message: String
  }

  extend type Query {
    getKycCountries: [Countries]
    getCurrency: [Currency]
    getEntity: Entity
    checkDomain(input: DomainQuery): Success
    getEntityCurrency: String
    getEntityType: [EntityType]
    getIndustryType: [EntityType]
    getEntitySettings: Settings
    getFaqByModule(input: ModuleInput!): ModuleFaq
    getTermsAndConditionsByModule(input: ModuleInput!): ModuleTermsAndConditions
    getMembersTermsAndConditions: TermAndConditions
    getDiscussionForumTermsAndConditions: TermAndConditions
    getEntityTheme: EntityAppearanceTheme
    checkEntitySubscription: EntitySubscriptionDetails
  }


  extend type Mutation {
    registerEntity(input: RegisterEntityInput): Success
    editEntityTheme(input: EditEntityTheme): EntityAppearanceTheme
    updateCurrency(input: InputCurrency): Currency
    updateEntitySettings(input: EntityAutoApprovalSettingsInput): Settings
    updateFaqByModule(module: String!, faq: JSON!): ModuleFaq
    updateTermsAndConditionsByModule(module: String!, termsAndConditions: JSON!): ModuleTermsAndConditions
    updateMemberTermsAndConditions(
      input: InputMemberTermsAndConditions
    ): TermAndConditions
    updateDiscussionForumTermsAndConditions(
      input: InputDiscussionForumTermsAndConditions
    ): TermAndConditions
    uploadEntityLogo(file: Upload!): UploadEntityLogoResponse
    uploadEntityLogo(file: Upload!): UploadEntityLogoResponse
    updateEntityProfile(input: UpdateEntityInput!): UpdateEntityProfileResponse
    changeEntityDomain(input: ChangeEntityDomainInput!): Success
    changeEntityCurrency(currency: String!): Success
  }
`;
