export const faqTypes = `#graphql
    scalar Date

    type faq {
        id: ID
        title: String
        description: String
        createdAt: Date
        updatedAt: Date
        sort: Int
        module: String
    }
    input inputFaq {
        module: String
    }
    
    extend type Query {
        getModuleFaq(input: inputFaq): [faq]
    }

    input inputDeleteFaq {
        id: ID!
    }
    
    input inputEditFaq {
        id: ID!
        title: String
        description: String
    }
    input inputAddFaq {
        title: String
        description: String
        module: String
    }
    input sortInputFaq {
        id: ID
        sort: Int
    }

    extend type Mutation {
        addFaq(input: inputAddFaq): [faq]
        editFaq(input: inputEditFaq): [faq]
        deleteFaq(input: inputDeleteFaq): faq
        sortFaq(input: [sortInputFaq]): faq
    }
`;
