import { AppDatabase } from "@thrico/database";
import { websites, navbars, footers, pages, modules } from "@thrico/database";

interface DefaultPageConfig {
  name: string;
  slug: string;
  order: number;
  seo?: any;
  includeInSitemap?: boolean;
  modules?: Array<{
    type: string;
    name: string;
    layout: string;
    isEnabled: boolean;
    order: number;
    content: any;
  }>;
}

/**
 * Creates default pages for a new website
 * @param websiteId - The ID of the website to create pages for
 * @param entityName - Name of the entity (for personalization)
 * @returns Array of created pages with their modules
 */
export async function createDefaultPages(
  db: AppDatabase,
  websiteId: string,
  entityName: string = "Your Organization"
) {
  // Define default pages configuration
  const defaultPagesConfig: DefaultPageConfig[] = [
    {
      name: "Home",
      slug: "home",
      order: 0,
      seo: {
        title: `Home - ${entityName}`,
        description: `Welcome to ${entityName}. Join us in our mission to make a difference.`,
        keywords: `${entityName}, home, community, impact`,
      },
      includeInSitemap: true,
      modules: [
        {
          type: "hero",
          name: "Hero Section",
          layout: "single-image",
          isEnabled: true,

          order: 0,
          content: {
            title: `Build Your Community, Together`,
            subtitle: "Building communities, creating impact",
            description:
              "Connect, collaborate, and grow with like-minded individuals. Join thousands of professionals building meaningful relationships.🎉Join Community",
            primaryButtonText: "Get Started",
            primaryButtonLink: "#",
            secondaryButtonText: "Learn More",
            secondaryButtonLink: "#about",
            imageUrl: "",
            backgroundImage: "",
          },
        },
        {
          type: "stats",
          name: "Key Metrics",
          layout: "stats-row",
          isEnabled: true,
          order: 1,
          content: {
            title: "Our Impact",
            description: "Making a difference through community engagement",
            stats: [
              { label: "Members", value: "1,000+", icon: "users" },
              { label: "Events", value: "50+", icon: "calendar" },
              { label: "Countries", value: "10+", icon: "globe" },
              { label: "Years", value: "5+", icon: "award" },
            ],
            layoutSettings: {
              alignment: "center",
              showIcons: true,
              columns: 4,
            },
          },
        },
        {
          type: "feature-highlights",
          name: "What We Offer",
          layout: "grid-highlights",
          isEnabled: true,
          order: 2,
          content: {
            title: "Why Join Us",
            description: "Discover the benefits of being part of our community",

            layoutSettings: {
              alignment: "center",
              columns: 3,
            },
          },
        },
      ],
    },
    {
      name: "About",
      slug: "about",
      order: 1,
      seo: {
        title: `About Us - ${entityName}`,
        description: `Learn more about ${entityName}, our mission, values, and the team behind our success.`,
        keywords: `about us, ${entityName}, company, team, mission`,
      },
      includeInSitemap: true,
      modules: [
        {
          type: "about",
          name: "About Us",
          layout: "story-vision",
          isEnabled: true,
          order: 0,
          content: {
            title: `About ${entityName}`,
            description: "Learn more about our mission and values",

            layoutSettings: {
              alignment: "left",
            },
          },
        },
        {
          type: "team-members",
          name: "Our Team",
          layout: "grid-profiles",
          isEnabled: true,

          order: 1,
          content: {
            title: "Meet Our Team",
            description: "The people behind our success",
            members: [
              {
                id: "1",
                name: "John Doe",
                role: "Founder & CEO",
                bio: "Passionate about building communities",
                imageUrl: "",
                socialLinks: {
                  linkedin: "",
                  twitter: "",
                },
              },
            ],
            layoutSettings: {
              alignment: "center",
              columns: 3,
            },
          },
        },
      ],
    },
    {
      name: "Contact",
      slug: "contact",
      order: 2,
      seo: {
        title: `Contact Us - ${entityName}`,
        description: `Get in touch with ${entityName}. We'd love to hear from you.`,
        keywords: `contact, ${entityName}, get in touch, email, phone`,
      },
      includeInSitemap: true,
      modules: [
        {
          type: "contact",
          name: "Contact Information",
          layout: "simple-contact",
          isEnabled: true,
          order: 0,
          content: {
            title: "Get in Touch",
            description: "We'd love to hear from you",
            email: "contact@example.com",
            phone: "+1 (555) 123-4567",
            address: "123 Main Street, City, Country",
            showContactForm: true,
            formFields: ["name", "email", "subject", "message"],
            layoutSettings: {
              alignment: "center",
              showMap: false,
            },
          },
        },
      ],
    },
  ];

  // Create pages and modules in a transaction.
  // Note: AppDatabase is a drizzle instance. We'll use it directly or inside a transaction if caller requests,
  // but here we just await individual inserts for simplicity or caller can wrap this function in a transaction.
  // Actually, drizzle doesn't easily support passing a 'tx' object that is same as 'db' in type unless we use generic context.
  // For now, I'll validly use 'db' as passed.

  const createdPages = [];

  for (const pageConfig of defaultPagesConfig) {
    // Create the page
    const [newPage] = await db
      .insert(pages)
      .values({
        websiteId,
        name: pageConfig.name,
        slug: pageConfig.slug,
        isEnabled: true,
        order: pageConfig.order,
        ...(pageConfig.seo && { seo: pageConfig.seo }),
        ...(pageConfig.includeInSitemap !== undefined && {
          includeInSitemap: pageConfig.includeInSitemap,
        }),
      })
      .returning();

    // Create modules for this page
    const createdModules = [];
    if (pageConfig.modules) {
      for (const moduleConfig of pageConfig.modules) {
        const [newModule] = await db
          .insert(modules)
          .values({
            pageId: newPage.id,
            type: moduleConfig.type,
            name: moduleConfig.name,
            layout: moduleConfig.layout,
            isEnabled: moduleConfig.isEnabled,
            order: moduleConfig.order,
            content: moduleConfig.content,
          })
          .returning();

        createdModules.push(newModule);
      }
    }

    createdPages.push({
      ...newPage,
      modules: createdModules,
    });
  }

  return createdPages;
}

/**
 * Creates default navbar for a new website
 */
export async function createDefaultNavbar(
  db: AppDatabase,
  websiteId: string,
  entityName: string,
  entityLogo: string = ""
) {
  const [navbar] = await db
    .insert(navbars)
    .values({
      websiteId,
      layout: "simple",
      isEnabled: true,
      content: {
        logo: {
          text: entityName,
          imageUrl: entityLogo,
        },
        menuItems: [
          { id: "1", label: "Home", link: "/home", order: 0 },
          { id: "2", label: "About", link: "/about", order: 1 },
          { id: "3", label: "Contact", link: "/contact", order: 2 },
        ],
        ctaButton: {
          text: "Join Now",
          link: "#signup",
          variant: "primary",
        },
        socialLinks: [],
      },
    })
    .returning();

  return navbar;
}

/**
 * Creates default footer for a new website
 */
export async function createDefaultFooter(
  db: AppDatabase,
  websiteId: string,
  entityName: string,
  entityLogo: string = ""
) {
  const [footer] = await db
    .insert(footers)
    .values({
      websiteId,
      layout: "columns",
      isEnabled: true,
      content: {
        logo: {
          text: entityName,
          imageUrl: entityLogo,
        },
        tagline:
          "Building meaningful professional communities, one connection at a time.",
        columns: [
          {
            id: "1",
            title: "Quick Links",
            links: [
              { id: "1", label: "Home", url: "/home" },
              { id: "2", label: "About", url: "/about" },
              { id: "3", label: "Contact", url: "/contact" },
            ],
          },
          {
            id: "2",
            title: "Legal",
            links: [
              { id: "1", label: "Privacy Policy", url: "/privacy" },
              { id: "2", label: "Terms of Service", url: "/terms" },
            ],
          },
        ],
        socialLinks: [
          { id: "1", platform: "twitter", url: "", icon: "twitter" },
          { id: "2", platform: "linkedin", url: "", icon: "linkedin" },
          { id: "3", platform: "facebook", url: "", icon: "facebook" },
        ],
        copyrightText: `© ${new Date().getFullYear()} ${entityName}. All rights reserved.`,
        showNewsletter: false,
      },
    })
    .returning();

  return footer;
}

/**
 * Initialize a complete website with default pages, navbar, and footer
 */
export async function initializeWebsite(
  db: AppDatabase,
  entityId: string,
  entityName: string,
  entityLogo: string,
  options?: {
    theme?: string;
    font?: string;
  }
) {
  // Create website
  const [website] = await db
    .insert(websites)
    .values({
      entityId,
      theme: options?.theme || "academia",
      font: options?.font || "inter",
      isPublished: false,
    })
    .returning();

  // Create navbar
  const navbar = await createDefaultNavbar(
    db,
    website.id,
    entityName,
    entityLogo
  );

  // Create footer
  const footer = await createDefaultFooter(
    db,
    website.id,
    entityName,
    entityLogo
  );

  // Create default pages
  const pages = await createDefaultPages(db, website.id, entityName);

  return {
    website,
    navbar,
    footer,
    pages,
  };
}
