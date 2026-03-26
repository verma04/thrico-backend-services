export const addonPricingTypes = `#graphql
  type AddonPricingItem {
    countryCode: String!
    addonPricingId: String!
    type: String!
    name: String!
    description: String
    unitLabel: String
    monthlyUnitPrice: Float!
    yearlyUnitPrice: Float!
    isActive: Boolean!
    order: Int!
    createdAt: String
    updatedAt: String
  }

  type GetAddonPricingResponse {
    addons: [AddonPricingItem!]!
    currency: String!
  }

  type Addon {
    addonId: String!
    type: String!
    name: String!
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    isActive: Boolean!
    addedAt: String
    removedAt: String
    effectiveFrom: String
  }

  type RazorpayOrder {
    id: String
    entity: String
    amount: Float
    currency: String
    receipt: String
    status: String
    created_at: Float
    notes: JSON
  }

  type AddAddonResponse {
    success: Boolean!
    message: String
    billingId: String
    amount: Float
    currency: String
    addon: Addon
    razorpayOrder: RazorpayOrder
  }

  type RemoveAddonResponse {
    success: Boolean!
    message: String
  }

  input AddAddonInput {
    addonPricingId: String!
    quantity: Int!
  }

  extend type Query {
    getAddonPricing: GetAddonPricingResponse!
  }

  extend type Mutation {
    addAddon(input: AddAddonInput!): AddAddonResponse!
    removeAddon(addonId: String!): RemoveAddonResponse!
  }
`;
