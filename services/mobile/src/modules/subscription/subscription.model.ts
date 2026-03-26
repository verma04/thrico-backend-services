export const subscriptionTypes = `#graphql
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

  extend type Query {
    checkSubscription: checkSubscription
    getFaqModule: [String]
  }
`;
