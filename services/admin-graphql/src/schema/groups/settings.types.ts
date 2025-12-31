const gql = String.raw;

// const { Parking } = require('../models/Parking')
const settingTypes = gql`
  type GroupSetting {
    autoApprove: Boolean
    views: Boolean
    discussion: Boolean
    user: Boolean
  }
  type Query {
    getCommunityGuidelines: String
    getCommunityTermAndConditions: String
    getGroupSettings: GroupSetting
  }

  input UpdateSettings {
    autoApprove: Boolean
    views: Boolean
    discussion: Boolean
    user: Boolean
  }
  input UpdateTermAndConditions {
    content: String
  }

  type Mutation {
    updateGroupSettings(input: UpdateSettings): GroupSetting
    updateCommunityTermAndConditions(input: UpdateTermAndConditions): String
    updateCommunityGuidelines(input: UpdateTermAndConditions): String
  }
`;

export { settingTypes };
