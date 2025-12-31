export const websiteTypes = `#graphql
  type Website {
    id: ID!
    entityId: ID!
    theme: String!
    font: String!
    isPublished: Boolean!
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
    keywords: [String!]
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
    id: ID!
    websiteId: ID!
    name: String!
    slug: String!
    isEnabled: Boolean!
    order: Int!
    modules: [Modules!]!
    createdAt: Date!
    updatedAt: Date!
    seo: websiteSeo
  }

  type Modules {
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

  # Queries
  extend type Query {
    getWebsite: Website
    getWebsiteBySlug(slug: String!): Website
    getPage(pageId: ID!): Page
  }

  # Mutations
  extend type Mutation {
    # Website mutations
    updateWebsiteTheme(websiteId: ID!, theme: String!): Website!
    updateWebsiteFont(websiteId: ID!, font: String!): Website!
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
    ): Module!
    updateModule(
      moduleId: ID!
      name: String
      layout: String
      content: JSON
      isEnabled: Boolean
    ): Module!
    deleteModule(moduleId: ID!): Boolean!
    reorderModules(pageId: ID!, moduleIds: [ID!]!): [Module!]!
  }
  
  type Module {
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
