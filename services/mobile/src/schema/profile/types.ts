export const profileTypes = `#graphql
  scalar Upload
  scalar JSON

  type userProfile {
    country: String!
    language: String!
    phone: phone
    timeZone: String
    DOB: String!
    gender: String
    education: JSON
    experience: JSON
    categories: [String]
    skills: [String]
  }

  type connectionsUsers {
    id: ID
    firstName: String
    lastName: String
    avatar: String
  }

  type userConnections {
    count: Int
    friends: [connectionsUsers]
  }

  type social {
    url: String
    platform: String
  }

  type about {
    social: [social]
    pronouns: String
    headline: String
    currentPosition: String
  }

  type education {
    id: String
    school: company
    degree: String
    grade: String
    activities: String
    description: String
    duration: [String]
  }

  type company {
    id: String
    name: String
    logo: String
  }

  type experience {
    id: String
    company: company
    duration: [String]
    employmentType: String
    locationType: String
    title: String
    startDate: String
    currentlyWorking: Boolean
    location: JSON
  }

  type phone {
    areaCode: String
    countryCode: Int
    isoCode: String
    phoneNumber: String
  }

  type userProfileCreation {
    firstName: String
    cover: String
    avatar: String
    lastName: String
    headline: String
    location: JSON
    profile: userProfile
    about: about
  }

  type page {
    name: String
    logo: String
    location: JSON
    type: String
    industry: String
    website: String
    pageType: String
    size: String
    tagline: String
    id: ID
  }

  input pageId {
    id: ID!
  }

  type profileInfoDetails {
    education: JSON
    experience: JSON
    skills: JSON
    interests: JSON
    socialLinks: JSON
    interestsCategories: JSON
    connections: userConnections
    followers: Int
    following: Int
  }

  type Query {
    getPageInfo(input: pageId!): page
    getProfileInfo: profileInfoDetails
    getUserProfileInfo(input: inputId): userProfileCreation
    getUserInterests: [String]
    getUserCategories: [String]
    updateUserLocation(input: inputUpdateLocation): user
    getProfileExperience: [experience]
    getOnlineConnections(limit: Int, offset: Int): userConnections
  }

  input inputProfileDetails {
    profileImage: Upload
    firstName: String!
    lastName: String!
    headline: String!
    location: JSON
  }

  input inputUpdateProfileCover {
    cover: Upload!
  }

  input inputUpdateLocation {
    latitude: Float
    longitude: Float
  }

  type Mutation {
    updateUserInterests(input: [String]): [String]
    updateUserCategories(input: [String]): [String]
    updateProfileDetails(input: inputProfileDetails): user
    updateProfileCover(input: inputUpdateProfileCover): user

    editEducation(input: inputEditEducation): [education]
    editExperience(input: inputEditExperience): [experience]
    editSkills(input: inputEditSkills): [String]
    updateOnlineStatus: Boolean
  }

  input inputEditEducation {
    education: JSON!
  }

  input inputEditExperience {
    experience: JSON!
  }

  input inputEditSkills {
    skills: JSON!
  }

  input inputEducation {
    id: String
    school: inputCompany
    degree: String
    grade: String
    activities: String
    description: String
    duration: [String]
  }

  input inputCompany {
    id: String
    name: String
    logo: String
  }

  input inputExperience {
    id: String
    company: inputCompany
    duration: [String]
    employmentType: String
    locationType: String
    title: String
    startDate: String
    currentlyWorking: Boolean
    location: JSON
  }
`;
