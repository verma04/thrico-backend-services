import { getDb, getDbForUser } from "../connection";
import { emailTemplate, entity } from "../schema";
import { and, eq, inArray } from "drizzle-orm";
import { BUILT_IN_TEMPLATES } from "./email-templates.config";
import { log } from "@thrico/logging";

async function seedEmailTemplates() {
  const db = await getDb();
  
  try {
    log.info("Starting email templates seeding...");

    // Get all entities to seed templates for
    const entities = await db.select({ id: entity.id, name: entity.name }).from(entity);

    if (entities.length === 0) {
      log.warn("No entities found. Seeding skipped.");
      return;
    }

    log.info(`Found ${entities.length} entities to seed.`);

    for (const ent of entities) {
      log.info(`Seeding templates for entity: ${ent.name} (${ent.id})`);

      for (const template of BUILT_IN_TEMPLATES) {
        // Check if template already exists for this entity (to avoid duplicates)
        const existing = await db.query.emailTemplate.findFirst({
          where: and(
            eq(emailTemplate.entity, ent.id),
            template.slug 
              ? eq(emailTemplate.slug, template.slug)
              : eq(emailTemplate.name, template.name)
          ),
        });

        if (existing) {
          log.info(`Template '${template.name}' (${template.slug || 'no-slug'}) already exists for ${ent.name}. Updating...`);
          await db.update(emailTemplate)
            .set({
              slug: template.slug || null,
              subject: template.subject,
              html: template.html,
              isDeletable: template.isDeletable,
              isActive: template.isActive,
              updatedAt: new Date(),
            })
            .where(eq(emailTemplate.id, existing.id));
        } else {
          log.info(`Creating template '${template.name}' (${template.slug || 'no-slug'}) for ${ent.name}.`);
          await db.insert(emailTemplate).values({
            entity: ent.id,
            name: template.name,
            slug: template.slug || null,
            subject: template.subject,
            html: template.html,
            isDeletable: template.isDeletable,
            isActive: template.isActive,
          });
        }
      }
    }

    log.info("Email templates seeding completed successfully!");
  } catch (error) {
    log.error("Error seeding email templates:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedEmailTemplates();
