const entityTypes = `#graphql
  scalar Upload
  scalar Date
  scalar JSON

  type success {
    success: Boolean
  }

  type websitePage {
    id: ID
    websiteId: ID!
    name: String!
    slug: String!
    isEnabled: Boolean!
    order: Int!
    modules: [WebsiteModule!]!
    createdAt: Date!
    updatedAt: Date!
    seo: websiteSeo
    navbar: Navbar
    footer: Footer
    font: String
    customColors: CustomThemeColors
    sitemapUrl: String
  }

  type token {
    id: ID
  }

  type jwtToken {
    token: String
  }

  type homePageCarousel {
    image: String
  }

  type entityTheme {
    primaryColor: String
    colorPrimary: String
  }

  type entity {
    id:ID
    name: String
    logo: String
    theme: entityTheme
    favicon: String
  }



  input inputSwitchAccount {
    entityId: ID!
    device_id: String
    deviceType: String
    deviceToken: String
    deviceName: String
  }

  type entityUser {
    id: ID
    email: String
    firstName: String
    lastName: String
    isApproved: Boolean
    isRequested: Boolean
    avatar: String
    about: aboutUser
    cover: String
    location: JSON
  }

  type aboutUser {
    bio: String
  }

  type tags {
    title: String
  }

  input faqModule {
    module: String
  }

  type faq {
    title: String
    description: String
  }

  type chooseAccount {
    token: String
    domain: String
    theme: entityTheme
  }

  type WebsiteModule {
    id: ID!
    pageId: ID!
    type: String!
    name: String!
    layout: String!
    isEnabled: Boolean!
    isCustomized: Boolean!
    order: Int!
    content: JSON!
    updatedAt: Date!
  }

  type websiteSeo {
    title: String
    description: String
    keywords: JSON
    schemaMarkup: JSON
  }

  type CustomThemeColors {
    primary: String
    secondary: String
    accent: String
    background: String
    muted: String
    border: String
    borderRadius: Int
    spacing: Float
    fontSize: Int
  }

  type Navbar {
    id: ID!
    websiteId: ID!
    layout: String!
    isEnabled: Boolean!
    content: JSON!
    updatedAt: Date!
    name: String!
    type: String!
  }

  type Footer {
    id: ID!
    websiteId: ID!
    layout: String!
    isEnabled: Boolean!
    content: JSON!
    updatedAt: Date!
    name: String!
    type: String!
  }

  input kyc {
    affliction: [String]!
    referralSource: [String]!
    comment: String!
    agreement: Boolean!
    identificationNumber: String
  }

   type modules {
    name: String
    icon: String
    showInMobileNavigation: Boolean
    isPopular: Boolean
    showInMobileNavigationSortNumber: Int
    enabled: Boolean
  }

   type checkSubscription {
    status: Boolean
    modules: [modules]
  }

  type Query {
    checkDomain(domain: String): entity
    getUser: entityUser


    getEntityTag: [tags]
    getModuleFaq(input: faqModule): [faq]
    getOrgDetails: entity
    getWebsitePageBySlug(domain:String!, slug: String!): websitePage
    getWebsiteFont(domain: String!): String

    getWebsiteCustomColor(domain: String!): CustomThemeColors
    getWebsiteCustomColors(domain: String!): CustomThemeColors
    getSitemapPages(domain: String!): [websitePage]
     
  }

  type Mutation {
    completeKyc(input: kyc): success
    switchAccount(input: inputSwitchAccount): chooseAccount
     checkSubscription: checkSubscription
  }
`;

export { entityTypes };
