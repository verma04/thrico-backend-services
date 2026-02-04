//
// This file contains the Shop GraphQL Type Definitions
// Copy this to: /Users/pulseplay/thrico/thrico-backend/services/admin-graphql/src/schema/shop/typeDefs.ts
//

export const shopTypeDefs = `#graphql
  # Enums
  enum ShopProductStatus {
    DRAFT
    ACTIVE
    ARCHIVED
    OUT_OF_STOCK
  }

  # Types
  type ShopProduct {
    id: ID!
    entity: ID!
    title: String!
    slug: String!
    description: String
    price: String!
    currency: String!
    category: String!
    tags: [String!]
    status: ShopProductStatus!
    hasVariants: Boolean!
    isOutOfStock: Boolean!
    externalLink: String
    createdAt: String!
    updatedAt: String!
    createdBy: ID
    numberOfViews: Int
    numberOfVariants: Int
    media: [ShopProductMedia!]
    sku: String
    variants: [ShopProductVariant!]
    options: [ShopProductOption!]
  }

  type ShopProductMedia {
    id: ID!
    productId: ID!
    url: String!
    sortOrder: Int!
    createdAt: String!
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
    createdAt: String!
    updatedAt: String!
  }

  type ShopProductOption {
    id: ID!
    productId: ID!
    entity: ID!
    name: String!
    values: JSON!
    createdAt: String!
    updatedAt: String!
  }

  type ShopBanner {
    id: ID!
    entity: ID!
    title: String!
    image: String!
    linkedProductId: ID
    sortOrder: Int!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
    createdBy: ID
    linkedProduct: ShopProduct
  }

  # Input Types
  input ShopProductFilterInput {
    status: ShopProductStatus
    category: String
  }

  input PaginationInput {
    limit: Int
    offset: Int
  }
  input inputProdutMedia {
    url: String!
    sortOrder: Int!
  }

  input CreateShopProductInput {
    title: String!
    slug: String
    description: String
    price: Int!
    currency: String
    category: String!
    tags: [String!]
    status: ShopProductStatus
    hasVariants: Boolean
    isOutOfStock: Boolean
    externalLink: String
    media: [inputProdutMedia]
    sku: String
  }

  input UpdateShopProductInput {
    title: String
    slug: String
    description: String
    price: String
    currency: String
    category: String
    tags: [String!]
    status: ShopProductStatus
    hasVariants: Boolean
    isOutOfStock: Boolean
    externalLink: String
    sku: String
   
  }

  input CreateShopProductVariantInput {
    productId: ID!
    title: String!
    sku: String
    price: String!
    currency: String
    inventory: Int
    isOutOfStock: Boolean
    options: JSON!
    image: Upload
    externalLink: String
  }

  input UpdateShopProductVariantInput {
    id: ID
    title: String
    sku: String
    price: String
    currency: String
    inventory: Int
    isOutOfStock: Boolean
    options: JSON
    image: Upload
    externalLink: String
  }

  input UpdateShopProductOptionInput {
    name: String!
    values: JSON!
  }

  input CreateShopBannerInput {
    title: String!
    image: Upload!
    linkedProductId: ID
    sortOrder: Int
    isActive: Boolean
  }

  input UpdateShopBannerInput {
    title: String
    image: Upload
    linkedProductId: ID
    sortOrder: Int
    isActive: Boolean
  }

  input BannerOrderInput {
    id: ID!
    sortOrder: Int!
  }

  # Queries
  type Query {
    getShopProducts(filter: ShopProductFilterInput, pagination: PaginationInput): [ShopProduct!]!
    getShopProduct(id: ID!): ShopProduct
    getShopBanners: [ShopBanner!]!
  }

  # Mutations
  type Mutation {
    createShopProduct(input: CreateShopProductInput!): ShopProduct!
    updateShopProduct(id: ID!, input: UpdateShopProductInput!): ShopProduct!
    deleteShopProduct(id: ID!): Boolean!
    
    createShopProductVariant(input: CreateShopProductVariantInput! , id:ID): ShopProductVariant!
    updateShopProductVariant(productId: ID, input: [UpdateShopProductVariantInput!]!): [ShopProductVariant!]!
    deleteShopProductVariant(id: ID!): Boolean!
    
    createShopBanner(input: CreateShopBannerInput!): ShopBanner!
    updateShopBanner(id: ID!, input: UpdateShopBannerInput!): ShopBanner!
    deleteShopBanner(id: ID!): Boolean!
    reorderShopBanners(bannerOrders: [BannerOrderInput!]!): [ShopBanner!]!
    
    updateShopProductMedia(productId: ID!, media: [inputProdutMedia]!): [ShopProductMedia!]!
    
    incrementShopProductViews(id: ID!): Boolean!
    
    updateShopProductOptions(productId: ID!, input: [UpdateShopProductOptionInput!]!): [ShopProductOption!]!
  }
`;
