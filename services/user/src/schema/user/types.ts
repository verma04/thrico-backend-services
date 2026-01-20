const userTypes = `#graphql
    scalar Upload

    type aboutUser {
        bio: String
        dob: String
        headline: String
    }

    type connection {
        id: ID
        firstName: String
        lastName: String
        avatar: String
        aboutUser: aboutUser
        isAdded: Boolean
    }
    input idInput {
        id: ID!
    }

    type entityAcccount {
    id: ID
    name: String
    logo: String
    lastActive: Date
    country: String
    isMember: Boolean
  }
    
    extend type Query {
        getAllConnection(input: idInput): [connection]
        getAllEntityUser: [connection]
        checkUserOnline(input: idInput): Response
        checkAllUserAccount: [entityAcccount]
        # getUser: connection
    
    }

    # extend type Mutation {
    #     switchAccount(input: idInput): Response
    # }

    type Response {
        status: Boolean
        message: String
    }
`;

export { userTypes };
