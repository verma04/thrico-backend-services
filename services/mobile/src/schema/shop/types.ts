export const shopTypes = `#graphql
  # Shop Product Types
  type ShopProductMedia {
    id: ID!
    productId: ID!
    url: String!
    sortOrder: Int!
    createdAt: Date!
  }

  type ShopProductVariant {
    id: ID!
    productId: ID!
    entity: ID!
    title: String!
    sku: String
    price: String!
    currency: String!
    inventory: Int!
    isOutOfStock: Boolean!
    options: JSON!
    image: String
    externalLink: String
    createdAt: Date!
    updatedAt: Date!
  }

  type ShopProductOption {
    id: ID!
    productId: ID!
    entity: ID!
    name: String!
    values: JSON!
    createdAt: Date!
    updatedAt: Date!
  }

  type ShopProduct {
    id: ID!
    entity: ID!
    title: String!
    slug: String!
    sku: String
    description: String
    price: String!
    currency: String!
    category: String!
    tags: [String]
    status: String!
    hasVariants: Boolean!
    isOutOfStock: Boolean!
    externalLink: String
    numberOfViews: Int!
    numberOfVariants: Int!
    createdAt: Date!
    updatedAt: Date!
    createdBy: ID
    media: [ShopProductMedia]
    variants: [ShopProductVariant]
    options: [ShopProductOption]
  }

  # Cursor-based pagination types
  type ShopProductEdge {
    cursor: String!
    node: ShopProduct!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type ShopProductConnection {
    edges: [ShopProductEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  # Input types
  input ShopProductFilter {
    category: String
    status: String
    search: String
  }

  extend type Query {
    getAllShopProducts(
      limit: Int
      cursor: String
      filter: ShopProductFilter
    ): ShopProductConnection!
    
    getShopProduct(id: ID!): ShopProduct
  }
`;
