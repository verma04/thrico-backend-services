export const websiteTypes = `#graphql
  type Website {
    id: ID
    entityId: ID
    theme: String
    font: String
    customColors: CustomThemeColors
    isPublished: Boolean
    customDomain: String
    navbar: Navbar
    footer: Footer
    pages: [Page!]!
    createdAt: Date!
    updatedAt: Date!
  }
  type websiteSeo {
    title: String
    description: String
    keywords: JSON
    schemaMarkup: JSON
  }

  input CustomThemeColorsInput {
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


  type Page {
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
    includeInSitemap: Boolean!
  }

  # Queries
  extend type Query {
    getWebsite: Website
    getWebsiteBySlug(slug: String!): Website
    getPage(pageId: ID!): Page
    getPageBySlug(websiteId: ID!, slug: String!): Page
    getAllPagesSeo(websiteId: ID!): [Page!]!
  }

  # Mutations
  extend type Mutation {
    # Website mutations
    updateWebsiteTheme(websiteId: ID!, theme: String!): Website!
    updateWebsiteFont(websiteId: ID!, font: String!): Website!
    updateWebsiteCustomColors(websiteId: ID!, customColors: CustomThemeColorsInput!):  CustomThemeColors!
    publishWebsite(websiteId: ID!): Website!

    # Navbar mutations
    updateNavbar(
      websiteId: ID!
      layout: String
      content: JSON
      isEnabled: Boolean
    ): Navbar!

    # Footer mutations
    updateFooter(
      websiteId: ID!
      layout: String
      content: JSON
      isEnabled: Boolean
    ): Footer!

    # Page mutations
    createPage(websiteId: ID!, name: String!, slug: String!): Page!
    updatePage(
      pageId: ID!
      name: String
      slug: String
      isEnabled: Boolean
      title: String
      description: String
      keywords: [String!]
      schemaMarkup: JSON
      includeInSitemap: Boolean
    ): Page!
    updatePageSeo(
      pageId: ID!
      title: String
      description: String
      keywords: [String!]
      schemaMarkup: JSON
      includeInSitemap: Boolean
    ): Page!
    deletePage(pageId: ID!): Boolean!
    reorderPages(websiteId: ID!, pageIds: [ID!]!): [Page!]!

    # Module mutations
    createModule(
      pageId: ID!
      type: String!
      name: String!
      layout: String!
      content: JSON!
    ): WebsiteModule!
    updateModule(
      moduleId: ID!
      name: String
      layout: String
      content: JSON
      isEnabled: Boolean
    ): WebsiteModule!
    deleteModule(moduleId: ID!): Boolean!
    reorderModules(pageId: ID!, moduleIds: [ID!]!): [WebsiteModule!]!
    toggleModule(moduleId: ID!, isEnabled: Boolean!): WebsiteModule!
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
`;
