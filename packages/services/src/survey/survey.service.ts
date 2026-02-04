import { and, eq, sql, count, desc } from "drizzle-orm";
import {
  surveys,
  customForms,
  questions,
  formResponses,
  AppDatabase,
  userFeed,
} from "@thrico/database";
import { GraphQLError } from "graphql";
import { log } from "@thrico/logging";
import { GamificationEventService } from "../gamification/gamification-event.service";

const DEFAULT_FORM_APPEARANCE = {
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  buttonColor: "#000000",
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e2e8f0",
  inputBackground: "#ffffff",
  inputBorderColor: "#e2e8f0",
  fontSize: 14,
  fontWeight: "normal",
  boxShadow: "none",
  hoverEffect: "none",
};

export interface SurveyTemplateQuestion {
  question: string;
  type: string;
  required: boolean;
  scale?: number;
  ratingType?: string;
  options?: string[];
  labels?: {
    start: string;
    end: string;
  };
}

export interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  questions: SurveyTemplateQuestion[];
}

const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: "csat-template",
    title: "Customer Satisfaction (CSAT)",
    description:
      "Measure how satisfied your customers are with your product or service.",
    questions: [
      {
        question: "How satisfied were you with your recent experience?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "What did you like most about the experience?",
        type: "LONG_TEXT",
        required: false,
      },
      {
        question:
          "How likely are you to recommend us to a friend or colleague?",
        type: "OPINION_SCALE",
        required: true,
        scale: 10,
        labels: { start: "Not likely", end: "Very likely" },
      },
      {
        question: "How easy was it to navigate our service?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Did our support team resolve your issue?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How would you rate the value for money?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "What is the primary reason for your score?",
        type: "LONG_TEXT",
        required: false,
      },
      {
        question: "How likely are you to use our service again?",
        type: "OPINION_SCALE",
        required: true,
        scale: 10,
        labels: { start: "Unlikely", end: "Very Likely" },
      },
      {
        question: "What one thing could we improve?",
        type: "SHORT_TEXT",
        required: false,
      },
      {
        question: "Overall, how would you rate your experience?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
    ],
  },
  {
    id: "employee-engagement-template",
    title: "Employee Engagement",
    description:
      "Understand employee morale and gather suggestions for improvement.",
    questions: [
      {
        question: "How happy are you working at this company?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "heart",
      },
      {
        question: "Do you feel your work is valued by your manager?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "What is one thing we could do to improve your workspace?",
        type: "LONG_TEXT",
        required: false,
      },
      {
        question: "How would you rate the work-life balance here?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Do you have the tools you need to do your job well?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How likely are you to be working here in two years?",
        type: "OPINION_SCALE",
        required: true,
        scale: 10,
        labels: { start: "Not likely", end: "Very likely" },
      },
      {
        question: "Does your team communicate effectively?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How would you rate the company culture?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Do you see a clear path for career growth?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "Any additional feedback for management?",
        type: "LONG_TEXT",
        required: false,
      },
    ],
  },
  {
    id: "product-feedback-template",
    title: "Product Feedback",
    description:
      "Collect insights on specific features or overall product usability.",
    questions: [
      {
        question: "Which feature do you use most often?",
        type: "MULTIPLE_CHOICE",
        required: true,
        options: ["Dashboard", "Reports", "Settings", "Profile"],
      },
      {
        question: "How easy is it to navigate the application?",
        type: "DROPDOWN",
        required: true,
        options: [
          "Very Easy",
          "Easy",
          "Neutral",
          "Difficult",
          "Very Difficult",
        ],
      },
      {
        question: "Is there any feature missing that you would like to see?",
        type: "LONG_TEXT",
        required: false,
      },
      {
        question: "How would you rate the performance/speed of the app?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Have you encountered any bugs recently?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How useful is the data provided in the reports?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "How would you rate the overall design of the product?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Would you prefer a mobile app over this web version?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How often do you use this product?",
        type: "DROPDOWN",
        required: true,
        options: ["Daily", "Weekly", "Monthly", "Rarely"],
      },
      {
        question: "Any other suggestions for our product team?",
        type: "LONG_TEXT",
        required: false,
      },
    ],
  },
  {
    id: "event-feedback-template",
    title: "Event Feedback",
    description:
      "Post-event survey to gather attendee impressions and suggestions.",
    questions: [
      {
        question: "How would you rate the overall event?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "What was your favorite session or activity?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How did you hear about this event?",
        type: "MULTIPLE_CHOICE",
        required: true,
        options: ["Email", "Social Media", "Friend", "Advertisement"],
      },
      {
        question: "Was the venue registration process smooth?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How would you rate the quality of speakers/presenters?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Did the event meet your expectations?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How would you rate the networking opportunities?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Would you attend this event next year?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "What topic would you like to see covered next time?",
        type: "SHORT_TEXT",
        required: false,
      },
      {
        question: "Any general comments or suggestions?",
        type: "LONG_TEXT",
        required: false,
      },
    ],
  },
  {
    id: "market-research-template",
    title: "Market Research",
    description: "Identify market trends and consumer preferences.",
    questions: [
      {
        question: "What is your primary goal when using such a service?",
        type: "MULTIPLE_CHOICE",
        required: true,
        options: [
          "Saving time",
          "Growing business",
          "Learning new skills",
          "Networking",
        ],
      },
      {
        question:
          "How much would you be willing to pay for this service monthly?",
        type: "NUMBER",
        required: true,
      },
      {
        question: "Are you currently using any competitor products?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How often do you purchase services in this category?",
        type: "DROPDOWN",
        required: true,
        options: ["Weekly", "Monthly", "Quarterly", "Yearly"],
      },
      {
        question: "Which of these factors is most important to you?",
        type: "MULTIPLE_CHOICE",
        required: true,
        options: ["Price", "Quality", "Customer Service", "Brand"],
      },
      {
        question: "How did you find out about us?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "What is your age group?",
        type: "DROPDOWN",
        required: true,
        options: ["18-24", "25-34", "35-44", "45-54", "55+"],
      },
      {
        question: "What is your current employment status?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "Do you make the final decision for such purchases?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "What other services are you looking for currently?",
        type: "LONG_TEXT",
        required: false,
      },
    ],
  },
  {
    id: "website-usability-template",
    title: "Website Usability",
    description: "Test your website's UI/UX by gathering user feedback.",
    questions: [
      {
        question: "Did you find what you were looking for?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How visually appealing is the website?",
        type: "OPINION_SCALE",
        required: true,
        scale: 10,
        labels: { start: "Poor", end: "Excellent" },
      },
      {
        question: "Any specific pages that were hard to use?",
        type: "LONG_TEXT",
        required: false,
      },
      {
        question: "How fast did the pages load for you?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Is the text easy to read?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How likely are you to visit again?",
        type: "OPINION_SCALE",
        required: true,
        scale: 10,
        labels: { start: "Never", end: "Very Likely" },
      },
      {
        question: "Did you encounter any broken links or errors?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "How would you rate the search functionality?",
        type: "RATING",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Is the navigation menu clear?",
        type: "YES_NO",
        required: true,
      },
      {
        question: "What is one thing we could change to make it better?",
        type: "LONG_TEXT",
        required: false,
      },
    ],
  },
  {
    id: "comprehensive-feedback-template",
    title: "Comprehensive Feedback Survey",
    description:
      "A detailed 20-question survey covering all aspects of your experience. All questions are required.",
    questions: [
      {
        question: "How satisfied are you with our overall service?",
        type: "SHORT_TEXT",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "How would you rate the quality of our product?",
        type: "SHORT_TEXT",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "How easy was it to use our platform?",
        type: "SHORT_TEXT",
        required: true,
        scale: 10,
        labels: { start: "Very Difficult", end: "Very Easy" },
      },
      {
        question: "Did you find our customer support helpful?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How likely are you to recommend us to others?",
        type: "SHORT_TEXT",
        required: true,
        scale: 10,
        labels: { start: "Not Likely", end: "Extremely Likely" },
      },
      {
        question: "What is your primary reason for using our service?",
        type: "MULTIPLE_CHOICE",
        required: true,
        options: [
          "Work",
          "Personal Use",
          "Education",
          "Business Growth",
          "Other",
        ],
      },
      {
        question: "How often do you use our service?",
        type: "DROPDOWN",
        required: true,
        options: [
          "Daily",
          "Several times a week",
          "Weekly",
          "Monthly",
          "Rarely",
        ],
      },
      {
        question: "How would you rate the value for money?",
        type: "SHORT_TEXT",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Was the onboarding process clear and helpful?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question:
          "How would you rate our communication (emails, notifications)?",
        type: "SHORT_TEXT",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Are you satisfied with the features available?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How would you rate the speed and performance?",
        type: "SHORT_TEXT",
        required: true,
        scale: 10,
        labels: { start: "Very Slow", end: "Very Fast" },
      },
      {
        question: "What age group do you belong to?",
        type: "SHORT_TEXT",
        required: true,
        options: [
          "Under 18",
          "18-24",
          "25-34",
          "35-44",
          "45-54",
          "55-64",
          "65+",
        ],
      },
      {
        question: "What is your profession?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How did you hear about us?",
        type: "SHORT_TEXT",
        required: true,
        options: [
          "Social Media",
          "Friend/Colleague",
          "Search Engine",
          "Advertisement",
          "Event",
          "Other",
        ],
      },
      {
        question: "Would you like to see more features added?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How would you rate our mobile experience (if applicable)?",
        type: "SHORT_TEXT",
        required: true,
        scale: 5,
        ratingType: "star",
      },
      {
        question: "Is there a feature you think is missing?",
        type: "SHORT_TEXT",
        required: true,
      },
      {
        question: "How would you rate your overall experience?",
        type: "SHORT_TEXT",
        required: true,
        scale: 10,
        labels: { start: "Very Poor", end: "Excellent" },
      },
      {
        question: "Please share any additional feedback or suggestions.",
        type: "LONG_TEXT",
        required: true,
      },
    ],
  },
];

export class SurveyService {
  /**
   * SURVEYS
   */

  static async getSurveys({
    entityId,
    input,
    db,
  }: {
    entityId: string;
    input?: any;
    db: any;
  }) {
    try {
      const { limit = 10, offset = 0, search, status } = input || {};

      const whereConditions = [eq(surveys.entityId, entityId)];

      if (status) {
        whereConditions.push(eq(surveys.status, status));
      }

      if (search) {
        whereConditions.push(
          sql`(${surveys.title} ILIKE ${`%${search}%`} OR ${surveys.description} ILIKE ${`%${search}%`})`,
        );
      }

      // 1. Get Total Count
      const [totalCountResult] = await db
        .select({ value: count() })
        .from(surveys)
        .where(and(...whereConditions));

      const totalCount = totalCountResult?.value || 0;

      // 2. Fetch Paginated Results
      const results = await db.query.surveys.findMany({
        where: and(...whereConditions),
        with: { form: true, responses: true },
        orderBy: [desc(surveys.createdAt)],
        limit,
        offset,
      });

      log.info("getSurveys results", { count: results?.length, totalCount });

      return {
        surveys: results || [],
        pagination: {
          totalCount,
          limit,
          offset,
        },
      };
    } catch (error) {
      log.error("Error in getSurveys", { error, entityId, input });
      throw error;
    }
  }

  static async getSurveysForUser({
    entityId,
    userId,
    input,
    db,
  }: {
    entityId: string;
    userId: string;
    input?: any;
    db: AppDatabase;
  }) {
    try {
      const { limit = 10, offset = 0, search } = input || {};

      const whereConditions = [
        eq(surveys.entityId, entityId),
        eq(surveys.status, "ACTIVE"), // Only return ACTIVE surveys for users
      ];

      if (search) {
        whereConditions.push(
          sql`(${surveys.title} ILIKE ${`%${search}%`} OR ${surveys.description} ILIKE ${`%${search}%`})`,
        );
      }

      // 1. Get Total Count
      const [totalCountResult] = await db
        .select({ value: count() })
        .from(surveys)
        .where(and(...whereConditions));

      const totalCount = totalCountResult?.value || 0;

      // 2. Fetch Paginated Results with form and questions
      const results = await db.query.surveys.findMany({
        where: and(...whereConditions),
        with: {
          form: {
            with: {
              questions: true,
            },
          },
        },
        orderBy: [desc(surveys.createdAt)],
        limit,
        offset,
      });

      // 3. Check which surveys the user has already submitted
      const surveyIds = results.map((s: any) => s.id);
      const userResponses =
        surveyIds.length > 0
          ? await db.query.formResponses.findMany({
              where: and(
                eq(formResponses.respondentId, userId),
                eq(formResponses.isSubmitted, true),
                sql`${formResponses.surveyId} IN (${sql.join(
                  surveyIds.map((id: string) => sql`${id}`),
                  sql`, `,
                )})`,
              ),
            })
          : [];

      const submittedSurveyIds = new Set(
        userResponses.map((r: any) => r.surveyId),
      );

      // 4. Add isSubmitted field to each survey
      const surveysWithSubmissionStatus = results.map((survey: any) => ({
        ...survey,
        isSubmitted: submittedSurveyIds.has(survey.id),
      }));

      log.info("getSurveysForUser results", {
        count: results?.length,
        totalCount,
        userId,
      });

      return {
        surveys: surveysWithSubmissionStatus || [],
        pagination: {
          totalCount,
          limit,
          offset,
        },
      };
    } catch (error) {
      log.error("Error in getSurveysForUser", { error, entityId, input });
      throw error;
    }
  }

  static async getSurvey({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      const surveyRecord = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, id), eq(surveys.entityId, entityId)),
        with: { form: true, responses: true },
      });
      if (!surveyRecord) throw new GraphQLError("Survey not found");
      return surveyRecord;
    } catch (error) {
      log.error("Error in getSurvey", { error, id, entityId });
      throw error;
    }
  }

  static async addSurvey({
    entityId,
    userId,
    input,
    db,
  }: {
    entityId: string;
    userId: string;
    input: any;
    db: any;
  }) {
    try {
      return await db.transaction(async (tx: any) => {
        // 2. Create the associated CustomForm
        const [newForm] = await tx
          .insert(customForms)
          .values({
            entityId,
            userId,
            addedBy: "ENTITY",
            title: input.title,
            appearance: DEFAULT_FORM_APPEARANCE,
            status: "DRAFT",
            previewType: "SCROLL_LONG",
          })
          .returning();

        // 3. Create a default question for the new form
        await tx.insert(questions).values({
          formId: newForm.id,
          type: "MULTIPLE_CHOICE",
          question: "How satisfied are you with our service?",
          options: [
            "Very satisfied",
            "Satisfied",
            "Neutral",
            "Dissatisfied",
            "Very dissatisfied",
          ],
          required: true,
          order: 0,
        });

        // 4. Create the Survey linked to the new form
        const [newSurvey] = await tx
          .insert(surveys)
          .values({
            entityId,
            formId: newForm.id,
            title: input.title,
            status: "DRAFT",
            startDate: input.startDate ? new Date(input.startDate) : null,
            endDate: input.endDate ? new Date(input.endDate) : null,
          })
          .returning();

        return newSurvey;
      });
    } catch (error) {
      log.error("Error in addSurvey", { error, entityId, userId });
      throw error;
    }
  }

  static async editSurvey({
    id,
    entityId,
    input,
    db,
  }: {
    id: string;
    entityId: string;
    input: any;
    db: any;
  }) {
    try {
      const [updatedSurvey] = await db
        .update(surveys)
        .set({
          title: input.title,
          description: input.description,
          status: input.status,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          updatedAt: new Date(),
        })
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entityId)))
        .returning();

      if (!updatedSurvey) throw new GraphQLError("Survey not found");
      return updatedSurvey;
    } catch (error) {
      log.error("Error in editSurvey", { error, id, entityId });
      throw error;
    }
  }

  static async shareSurveyAsFeed({
    surveyId,
    shouldShare,
    description,
    userId,
    entityId,
    db,
  }: {
    surveyId: string;
    shouldShare: boolean;
    description?: string;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      // 1. Get current survey status
      const survey = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, surveyId), eq(surveys.entityId, entityId)),
      });

      if (!survey) throw new GraphQLError("Survey not found");

      return await db.transaction(async (tx: any) => {
        // 2. Update survey SharedAsFeed status
        const [updatedSurvey] = await tx
          .update(surveys)
          .set({
            sharedAsFeed: shouldShare,
            updatedAt: new Date(),
          })
          .where(eq(surveys.id, surveyId))
          .returning();

        // 3. Handle Feed logic
        if (shouldShare) {
          // Check if already shared
          const existingFeed = await tx.query.userFeed.findFirst({
            where: and(
              eq(userFeed.surveyId, surveyId),
              eq(userFeed.source, "survey"),
            ),
          });

          if (!existingFeed) {
            // Create new feed item
            await tx.insert(userFeed).values({
              userId,
              entity: entityId,
              source: "survey",
              surveyId: surveyId,
              status: "APPROVED",
              priority: "NORMAL",
              privacy: "PUBLIC",
              addedBy: "ENTITY",
              description: description || survey.description || survey.title,
            });
          }
        } else {
          // Remove from feed if it exists
          await tx
            .delete(userFeed)
            .where(
              and(
                eq(userFeed.surveyId, surveyId),
                eq(userFeed.source, "survey"),
              ),
            );
        }

        return updatedSurvey;
      });
    } catch (error) {
      log.error("Error in shareSurveyAsFeed", {
        error,
        surveyId,
        shouldShare,
        userId,
      });
      throw error;
    }
  }

  static async deleteSurvey({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      await db
        .delete(surveys)
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entityId)));
      return { id, deleted: true };
    } catch (error) {
      log.error("Error in deleteSurvey", { error, id, entityId });
      throw error;
    }
  }

  static async publishSurvey({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      const [updatedSurvey] = await db
        .update(surveys)
        .set({
          status: "ACTIVE",
          updatedAt: new Date(),
        })
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entityId)))
        .returning();

      if (!updatedSurvey) throw new GraphQLError("Survey not found");
      return updatedSurvey;
    } catch (error) {
      log.error("Error in publishSurvey", { error, id, entityId });
      throw error;
    }
  }

  static async draftSurvey({
    id,
    entityId,
    db,
  }: {
    id: string;
    entityId: string;
    db: any;
  }) {
    try {
      const [updatedSurvey] = await db
        .update(surveys)
        .set({
          status: "DRAFT",
          updatedAt: new Date(),
        })
        .where(and(eq(surveys.id, id), eq(surveys.entityId, entityId)))
        .returning();

      if (!updatedSurvey) throw new GraphQLError("Survey not found");
      return updatedSurvey;
    } catch (error) {
      log.error("Error in draftSurvey", { error, id, entityId });
      throw error;
    }
  }

  static async submitSurvey({
    surveyId,
    answers,
    userId,
    entityId,
    db,
  }: {
    surveyId: string;
    answers: Record<string, any>;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      // 1. Validate survey exists and belongs to entity
      const survey = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, surveyId), eq(surveys.entityId, entityId)),
      });

      if (!survey) {
        throw new GraphQLError("Survey not found");
      }

      // 2. Validate survey is active
      if (survey.status !== "ACTIVE") {
        throw new GraphQLError("Survey is not active");
      }

      // 3. Create form response (or update existing if starting from in-progress)
      const existingInProgress = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.surveyId, surveyId),
          eq(formResponses.respondentId, userId),
          eq(formResponses.isSubmitted, false),
        ),
      });

      let response;
      if (existingInProgress) {
        [response] = await db
          .update(formResponses)
          .set({
            answers: answers,
            isSubmitted: true,
            submittedAt: new Date(),
          })
          .where(eq(formResponses.id, existingInProgress.id))
          .returning();
      } else {
        // Fallback for direct submit without startSurvey
        [response] = await db
          .insert(formResponses)
          .values({
            formId: survey.formId,
            surveyId: surveyId,
            answers: answers,
            respondentId: userId,
            isSubmitted: true,
          })
          .returning();
      }

      log.info("Survey response submitted", {
        surveyId,
        responseId: response.id,
        userId,
      });

      // Trigger gamification event
      await GamificationEventService.triggerEvent({
        triggerId: "tr-survey-submit",
        moduleId: "surveys",
        userId,
        entityId,
        referenceId: surveyId,
      });

      return response;
    } catch (error) {
      log.error("Error in submitSurvey", {
        error,
        surveyId,
        userId,
        entityId,
      });
      throw error;
    }
  }

  static async getSurveyById({
    id,
    userId,
    entityId,
    db,
  }: {
    id: string;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      const surveyRecord = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, id), eq(surveys.entityId, entityId)),
        with: {
          form: {
            with: {
              questions: true,
            },
          },
        },
      });

      if (!surveyRecord) throw new GraphQLError("Survey not found");

      // Get user's current response (could be in-progress or submitted)
      const userResponse = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.surveyId, id),
          eq(formResponses.respondentId, userId),
        ),
        orderBy: [desc(formResponses.submittedAt)],
      });

      // Check if user has submitted
      const isSubmitted = !!userResponse?.isSubmitted;

      return {
        ...surveyRecord,
        userResponse,
        isSubmitted,
      };
    } catch (error) {
      log.error("Error in getSurveyById", { error, id, userId, entityId });
      throw error;
    }
  }

  static async startSurvey({
    surveyId,
    userId,
    entityId,
    db,
  }: {
    surveyId: string;
    userId: string;
    entityId: string;
    db: any;
  }) {
    try {
      // 1. Validate survey exists and is active
      const survey = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, surveyId), eq(surveys.entityId, entityId)),
      });

      if (!survey) throw new GraphQLError("Survey not found");
      if (survey.status !== "ACTIVE")
        throw new GraphQLError("Survey is not active");

      // 2. Check if user already has a response
      const existingResponse = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.surveyId, surveyId),
          eq(formResponses.respondentId, userId),
        ),
      });

      if (existingResponse) {
        if (existingResponse.isSubmitted) {
          throw new GraphQLError("Survey already submitted");
        }
        return existingResponse; // Resume existing
      }

      // 3. Create initial empty response
      const [newResponse] = await db
        .insert(formResponses)
        .values({
          formId: survey.formId,
          surveyId: surveyId,
          answers: {},
          respondentId: userId,
          isSubmitted: false,
        })
        .returning();

      return newResponse;
    } catch (error) {
      log.error("Error in startSurvey", { error, surveyId, userId });
      throw error;
    }
  }

  static async saveSurveyResponse({
    responseId,
    answers,
    userId,
    db,
  }: {
    responseId: string;
    answers: Record<string, any>;
    userId: string;
    db: any;
  }) {
    try {
      // Validate ownership
      const existing = await db.query.formResponses.findFirst({
        where: and(
          eq(formResponses.id, responseId),
          eq(formResponses.respondentId, userId),
        ),
      });

      if (!existing)
        throw new GraphQLError("Response not found or access denied");

      if (existing.isSubmitted)
        throw new GraphQLError("Cannot update a submitted response");

      const [updatedResponse] = await db
        .update(formResponses)
        .set({
          answers: { ...existing.answers, ...answers }, // Merge answers
          submittedAt: new Date(), // Update last activity
        })
        .where(eq(formResponses.id, responseId))
        .returning();

      return updatedResponse;
    } catch (error) {
      log.error("Error in saveSurveyResponse", { error, responseId, userId });
      throw error;
    }
  }

  static async getSurveyResponses({
    surveyId,
    entityId,
    input,
    db,
  }: {
    surveyId: string;
    entityId: string;
    input?: any;
    db: any;
  }) {
    try {
      const { limit = 10, offset = 0, userId } = input || {};

      // 1. Validate survey exists and belongs to entity
      const survey = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, surveyId), eq(surveys.entityId, entityId)),
      });

      if (!survey) throw new GraphQLError("Survey not found");

      const whereConditions = [
        eq(formResponses.surveyId, surveyId),
        eq(formResponses.isSubmitted, true),
      ];

      if (userId) {
        whereConditions.push(eq(formResponses.respondentId, userId));
      }

      // 2. Get Total Count
      const [totalCountResult] = await db
        .select({ value: count() })
        .from(formResponses)
        .where(and(...whereConditions));

      const totalCount = totalCountResult?.value || 0;

      // 3. Fetch Paginated Results
      const results = await db.query.formResponses.findMany({
        where: and(...whereConditions),
        with: { respondent: true },
        orderBy: [desc(formResponses.submittedAt)],
        limit,
        offset,
      });

      return {
        responses: results || [],
        pagination: {
          totalCount,
          limit,
          offset,
        },
      };
    } catch (error) {
      log.error("Error in getSurveyResponses", { error, surveyId, entityId });
      throw error;
    }
  }

  static async getSurveyResults({
    surveyId,
    entityId,
    db,
  }: {
    surveyId: string;
    entityId: string;
    db: any;
  }) {
    try {
      // 1. Validate survey exists and belongs to entity
      const survey = await db.query.surveys.findFirst({
        where: and(eq(surveys.id, surveyId), eq(surveys.entityId, entityId)),
        with: {
          form: {
            with: {
              questions: true,
            },
          },
        },
      });

      if (!survey) throw new GraphQLError("Survey not found");

      // 2. Fetch all submitted responses
      const responses = await db.query.formResponses.findMany({
        where: and(
          eq(formResponses.surveyId, surveyId),
          eq(formResponses.isSubmitted, true),
        ),
      });

      const totalResponses = responses.length;

      // 3. Aggregate results
      const questionResults = survey.form.questions.map((question: any) => {
        const questionId = question.id;
        const answers = responses
          .map((r: any) => r.answers[questionId])
          .filter((a: any) => a !== undefined && a !== null);
        const totalAnswers = answers.length;

        const result: any = {
          questionId,
          question: question.question,
          type: question.type,
          totalAnswers,
        };

        if (
          ["MULTIPLE_CHOICE", "DROPDOWN", "YES_NO", "ISOPTION"].includes(
            question.type,
          )
        ) {
          const choiceCounts: Record<string, number> = {};

          // Initialize counts for options if available
          if (question.options && Array.isArray(question.options)) {
            question.options.forEach((opt: string) => {
              choiceCounts[opt] = 0;
            });
          } else if (question.type === "YES_NO") {
            choiceCounts["Yes"] = 0;
            choiceCounts["No"] = 0;
          }

          answers.forEach((ans: any) => {
            if (Array.isArray(ans)) {
              ans.forEach((a: string) => {
                choiceCounts[a] = (choiceCounts[a] || 0) + 1;
              });
            } else {
              choiceCounts[ans] = (choiceCounts[ans] || 0) + 1;
            }
          });

          result.choices = Object.entries(choiceCounts).map(
            ([label, count]) => ({
              label,
              count,
              percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
            }),
          );
        } else {
          // Open-ended or other types, just return the latest 10 unique answers as a preview
          result.answers = Array.from(new Set(answers)).slice(0, 10);
        }

        return result;
      });

      return {
        surveyId,
        totalResponses,
        questionResults,
      };
    } catch (error) {
      log.error("Error in getSurveyResults", { error, surveyId, entityId });
      throw error;
    }
  }

  static async getSurveyStats({
    entityId,
    timeRange,
    db,
  }: {
    entityId: string;
    timeRange:
      | "LAST_24_HOURS"
      | "LAST_7_DAYS"
      | "LAST_30_DAYS"
      | "LAST_90_DAYS";
    db: any;
  }) {
    try {
      const now = new Date();
      let startDate: Date;
      let prevStartDate: Date;
      let interval: "hour" | "day" = "day";

      switch (timeRange) {
        case "LAST_24_HOURS":
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          interval = "hour";
          break;
        case "LAST_7_DAYS":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(
            startDate.getTime() - 7 * 24 * 60 * 60 * 1000,
          );
          break;
        case "LAST_30_DAYS":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(
            startDate.getTime() - 30 * 24 * 60 * 60 * 1000,
          );
          break;
        case "LAST_90_DAYS":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(
            startDate.getTime() - 90 * 24 * 60 * 60 * 1000,
          );
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          prevStartDate = new Date(
            startDate.getTime() - 30 * 24 * 60 * 60 * 1000,
          );
      }

      // 1. Current Period Stats
      const [currStats] = await db
        .select({
          totalSurveys: sql<number>`count(${surveys.id})`,
          activeSurveys: sql<number>`count(case when ${surveys.status} = 'ACTIVE' then 1 end)`,
        })
        .from(surveys)
        .where(
          and(
            eq(surveys.entityId, entityId),
            sql`${surveys.createdAt} >= ${startDate}`,
          ),
        );

      const [currResponses] = await db
        .select({
          totalResponses: count(),
        })
        .from(formResponses)
        .innerJoin(surveys, eq(formResponses.surveyId, surveys.id))
        .where(
          and(
            eq(surveys.entityId, entityId),
            eq(formResponses.isSubmitted, true),
            sql`${formResponses.submittedAt} >= ${startDate}`,
          ),
        );

      // 2. Previous Period Stats (for change calculation)
      const [prevStats] = await db
        .select({
          totalSurveys: sql<number>`count(${surveys.id})`,
          activeSurveys: sql<number>`count(case when ${surveys.status} = 'ACTIVE' then 1 end)`,
        })
        .from(surveys)
        .where(
          and(
            eq(surveys.entityId, entityId),
            sql`${surveys.createdAt} >= ${prevStartDate}`,
            sql`${surveys.createdAt} < ${startDate}`,
          ),
        );

      const [prevResponses] = await db
        .select({
          totalResponses: count(),
        })
        .from(formResponses)
        .innerJoin(surveys, eq(formResponses.surveyId, surveys.id))
        .where(
          and(
            eq(surveys.entityId, entityId),
            eq(formResponses.isSubmitted, true),
            sql`${formResponses.submittedAt} >= ${prevStartDate}`,
            sql`${formResponses.submittedAt} < ${startDate}`,
          ),
        );

      // 3. Overall Stats (No time filter for these basic counts)
      const [overallStats] = await db
        .select({
          totalSurveys: count(),
          activeSurveys: sql<number>`count(case when ${surveys.status} = 'ACTIVE' then 1 end)`,
        })
        .from(surveys)
        .where(eq(surveys.entityId, entityId));

      const [overallResponses] = await db
        .select({
          totalResponses: count(),
        })
        .from(formResponses)
        .innerJoin(surveys, eq(formResponses.surveyId, surveys.id))
        .where(
          and(
            eq(surveys.entityId, entityId),
            eq(formResponses.isSubmitted, true),
          ),
        );

      // 4. Trend Data
      const trendResults = await db
        .select({
          date:
            interval === "hour"
              ? sql<string>`to_char(${formResponses.submittedAt}, 'YYYY-MM-DD HH24:00')`
              : sql<string>`to_char(${formResponses.submittedAt}, 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(formResponses)
        .innerJoin(surveys, eq(formResponses.surveyId, surveys.id))
        .where(
          and(
            eq(surveys.entityId, entityId),
            eq(formResponses.isSubmitted, true),
            sql`${formResponses.submittedAt} >= ${startDate}`,
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`);

      // 5. Status Distribution
      const statusResults = await db
        .select({
          status: surveys.status,
          count: count(),
        })
        .from(surveys)
        .where(eq(surveys.entityId, entityId))
        .groupBy(surveys.status);

      // Helper to calculate percentage change
      const calcChange = (curr: any, prev: any) => {
        const c = Number(curr || 0);
        const p = Number(prev || 0);
        if (p === 0) return c > 0 ? 100 : 0;
        return ((c - p) / p) * 100;
      };

      const totalResponses = Number(overallResponses?.totalResponses || 0);
      const totalSurveys = Number(overallStats?.totalSurveys || 0);
      const activeSurveys = Number(overallStats?.activeSurveys || 0);

      // Current period values
      const curTotSur = Number(currStats?.totalSurveys || 0);
      const curActSur = Number(currStats?.activeSurveys || 0);
      const curResps = Number(currResponses?.totalResponses || 0);

      // Previous period values
      const preTotSur = Number(prevStats?.totalSurveys || 0);
      const preActSur = Number(prevStats?.activeSurveys || 0);
      const preResps = Number(prevResponses?.totalResponses || 0);

      // Completion rate calculation (responses per survey)
      const completionRate =
        totalSurveys > 0 ? totalResponses / totalSurveys : 0;
      const curCompRate = curTotSur > 0 ? curResps / curTotSur : 0;
      const preCompRate = preTotSur > 0 ? preResps / preTotSur : 0;

      return {
        totalSurveys,
        activeSurveys,
        totalResponses,
        completionRate,
        totalSurveysChange: calcChange(curTotSur, preTotSur),
        activeSurveysChange: calcChange(curActSur, preActSur),
        totalResponsesChange: calcChange(curResps, preResps),
        completionRateChange: calcChange(curCompRate, preCompRate),
        responseTrend: trendResults.map((r: any) => ({
          date: r.date,
          count: Number(r.count || 0),
        })),
        statusDistribution: statusResults.map((r: any) => ({
          status: r.status,
          count: Number(r.count || 0),
        })),
      };
    } catch (error) {
      log.error("Error in getSurveyStats", { error, entityId, timeRange });
      throw error;
    }
  }

  static async getSurveyTemplates() {
    return SURVEY_TEMPLATES;
  }

  static async createSurveyFromTemplate({
    entityId,
    userId,
    templateId,
    db,
  }: {
    entityId: string;
    userId: string;
    templateId: string;
    db: any;
  }) {
    try {
      const template = SURVEY_TEMPLATES.find((t) => t.id === templateId);
      if (!template) throw new GraphQLError("Template not found");

      return await db.transaction(async (tx: any) => {
        // 1. Create the CustomForm
        const [newForm] = await tx
          .insert(customForms)
          .values({
            entityId,
            userId,
            addedBy: "ENTITY",
            title: template.title,
            description: template.description,
            appearance: DEFAULT_FORM_APPEARANCE,
            status: "DRAFT",
            previewType: "MULTI_STEP",
          })
          .returning();

        // 2. Create the questions
        if (template.questions && template.questions.length > 0) {
          await tx.insert(questions).values(
            template.questions.map((q, index) => ({
              formId: newForm.id,
              type: q.type,
              question: q.question,
              required: q.required || false,
              order: index,
              scale: q.scale || null,
              ratingType: q.ratingType || "star",
              options: q?.options || null,
              labels: q?.labels || null,
            })),
          );
        }

        // 3. Create the Survey linked to the form
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        const [newSurvey] = await tx
          .insert(surveys)
          .values({
            entityId,
            formId: newForm.id,
            title: template.title,
            description: template.description,
            status: "DRAFT",
            startDate,
            endDate,
          })
          .returning();

        return newSurvey;
      });
    } catch (error) {
      log.error("Error in createSurveyFromTemplate", {
        error,
        templateId,
        entityId,
      });
      throw error;
    }
  }
}
