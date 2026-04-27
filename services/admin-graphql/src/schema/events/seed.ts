import {
  eventsAgenda,
  eventHost,
  eventsMedia,
  eventsSponsorShip,
  eventSponsors,
  eventsTickets,
} from "@thrico/database";

export async function seedEventDetails(
  tx: any,
  eventId: string,
  entityId: string,
  userId: string,
) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Seed Agenda (3 default sessions)
  await tx.insert(eventsAgenda).values([
    {
      eventId,
      title: "Opening Keynote",
      date: todayStr,
      startTime: "09:00:00",
      endTime: "10:00:00",
      isPublished: true,
      isPinned: true,
      isDraft: false,
    },
    {
      eventId,
      title: "Networking Break",
      date: todayStr,
      startTime: "10:00:00",
      endTime: "11:00:00",
      isPublished: true,
      isPinned: false,
      isDraft: false,
    },
    {
      eventId,
      title: "Afternoon Workshop",
      date: todayStr,
      startTime: "14:00:00",
      endTime: "16:00:00",
      isPublished: true,
      isPinned: false,
      isDraft: false,
    },
  ]);

  // 2. Seed Hosts (Add creator as main host)
  await tx.insert(eventHost).values({
    eventId,
    userId,
    hostType: "host",
    entity: entityId,
  });

  // 3. Seed Media (Placeholder)
  await tx.insert(eventsMedia).values({
    eventId,
    url: "https://images.unsplash.com/photo-1540575861501-7ad060e39fe1?q=80&w=2670&auto=format&fit=crop",
    mediaType: "image",
    title: "Event Cover",
    isPublic: true,
  });

  // 4. Seed Sponsorship Tiers
  const [goldTier, silverTier] = await tx
    .insert(eventsSponsorShip)
    .values([
      {
        eventId,
        sponsorType: "Gold",
        price: "1000",
        currency: "USD",
        showPrice: true,
        content: { description: "Premium Gold Tier sponsorship" },
      },
      {
        eventId,
        sponsorType: "Silver",
        price: "500",
        currency: "USD",
        showPrice: true,
        content: { description: "Standard Silver Tier sponsorship" },
      },
    ])
    .returning();

  // 5. Seed Placeholder Sponsor for Gold Tier
  await tx.insert(eventSponsors).values({
    eventId,
    sponsorShipId: goldTier.id,
    sponsorName: "Placeholder Corp",
    sponsorLogo: "https://via.placeholder.com/150",
    sponsorUserName: "Contact Person",
    sponsorUserDesignation: "Partnership Manager",
    isApproved: true,
  });

  // 6. Seed Tickets (Free & Paid)
  await tx.insert(eventsTickets).values([
    {
      eventId,
      name: "Early Bird",
      type: "free",
      price: "0",
      quantity: 50,
      description: "Free registration for early birds",
      isVisible: true,
    },
    {
      eventId,
      name: "General Admission",
      type: "paid",
      price: "20",
      quantity: 100,
      description: "Full access to the event",
      isVisible: true,
    },
  ]);
}
