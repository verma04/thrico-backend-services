export const alumniStoriesTypes = `#graphql
    # scalar Upload # Already defined
    # scalar Date # Already defined
    
    type alumniCategory {
        id: ID
        title: String
        createdAt: Date
        updatedAt: Date
    }
    
    type alumniStories {
        id: ID
        title: String
        cover: String
        slug: String
        category: alumniCategory
        isApproved: Boolean
        createdAt: Date
        shortDescription: String
        description: String
        updatedAt: Date
        user: User # Changed userDetails to User for consistency
    }
    
    extend type Query {
        getAllAlumniStoriesCategory: [alumniCategory]
        getAllAlumniStories: [alumniStories]
        getAllApprovedAlumniStories: [alumniStories]
        getAllApprovedRequestedStories: [alumniStories]
    }

    input inputuserStoryCategory {
        title: String!
    }
    input inputuserStoryCategoryId {
        id: ID!
    }

    input alumniStoriesInput {
        action: String! # LocationType was in provided snippet, assume String for now or Enum if known
        ID: ID!
    }
    
    extend type Mutation {
        alumniStoriesActions(input: alumniStoriesInput): alumniStories

        adduserStoryCategory(input: inputuserStoryCategory): [alumniCategory]
        deleteuserStoryCategory(input: inputuserStoryCategoryId): alumniCategory
        duplicateuserStoryCategory(
            input: inputuserStoryCategoryId
        ): [alumniCategory]
    }
`;
