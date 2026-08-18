import {
  leadTimelineEvents,
  leads,
  type DatabaseConnection,
} from "@axos/database";

import {
  and,
  eq,
  isNull,
} from "drizzle-orm";

import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from "../schemas/lead.schema.js";

export interface CreateLeadContext {
  organizationId: string;
  membershipId: string;
}

export class LeadRepository {
  constructor(
    private readonly database:
      DatabaseConnection,
  ) {}


  async archive(
  context: CreateLeadContext,
  leadId: string,
  reason?: string,
) {
  return this.database.db.transaction(
    async (tx) => {
      const now = new Date();

      const [archivedLead] =
        await tx
          .update(leads)
          .set({
            archivedAt: now,

            archivedByMembershipId:
              context.membershipId,

            archiveReason:
              reason ?? null,

            updatedAt: now,
          })
          .where(
            and(
              eq(
                leads.id,
                leadId,
              ),
              eq(
                leads.organizationId,
                context.organizationId,
              ),
              isNull(
                leads.archivedAt,
              ),
            ),
          )
          .returning();

      if (!archivedLead) {
        return null;
      }

      await tx
        .insert(
          leadTimelineEvents,
        )
        .values({
          organizationId:
            context.organizationId,

          leadId:
            archivedLead.id,

          createdByMembershipId:
            context.membershipId,

          eventType:
            "archived",

          title:
            "Lead archived",

          description:
            reason ?? null,

          metadata: {
            previousStatus:
              archivedLead.status,
          },
        });

      return archivedLead;
    },
  );
}

  async update(
  context: CreateLeadContext,
  leadId: string,
  input: UpdateLeadInput,
  expectedStatus: typeof leads.$inferSelect.status,
) {
  return this.database.db.transaction(
    async (tx) => {
      const now = new Date();

      const statusChanged =
        input.status !== undefined &&
        input.status !== expectedStatus;

      const terminalStatuses =
        new Set([
          "converted",
          "lost",
          "closed",
        ]);

      const updateValues:
        Partial<
          typeof leads.$inferInsert
        > = {
          updatedAt: now,
        };

      if (
        input.title !== undefined
      ) {
        updateValues.title =
          input.title;
      }

      if (
        input.firstName !==
        undefined
      ) {
        updateValues.firstName =
          input.firstName;
      }

      if (
        input.lastName !==
        undefined
      ) {
        updateValues.lastName =
          input.lastName;
      }

      if (
        input.email !== undefined
      ) {
        updateValues.email =
          input.email;
      }

      if (
        input.phone !== undefined
      ) {
        updateValues.phone =
          input.phone;
      }

      if (
        input.leadType !==
        undefined
      ) {
        updateValues.leadType =
          input.leadType;
      }

      if (
        input.status !== undefined
      ) {
        updateValues.status =
          input.status;
      }

      if (
        input.source !== undefined
      ) {
        updateValues.source =
          input.source;
      }

      if (
        input.sourceDetails !==
        undefined
      ) {
        updateValues.sourceDetails =
          input.sourceDetails;
      }

      if (
        input.notes !== undefined
      ) {
        updateValues.notes =
          input.notes;
      }

      if (
        input.metadata !==
        undefined
      ) {
        updateValues.metadata =
          input.metadata;
      }

      /*
       * closed_at records when the lead entered
       * a terminal state.
       */
      if (
        statusChanged &&
        input.status
      ) {
        updateValues.closedAt =
          terminalStatuses.has(
            input.status,
          )
            ? now
            : null;
      }

      /*
       * Optimistic guard:
       *
       * If another request changed the lead's
       * status after the service read it,
       * don't silently overwrite that change.
       */
      const [updatedLead] =
        await tx
          .update(leads)
          .set(updateValues)
          .where(
            and(
              eq(
                leads.id,
                leadId,
              ),
              eq(
                leads.organizationId,
                context.organizationId,
              ),
              eq(
                leads.status,
                expectedStatus,
              ),
            ),
          )
          .returning();

      if (!updatedLead) {
        return null;
      }

      const suppliedFields =
        Object.keys(input);

      const ordinaryFields =
        suppliedFields.filter(
          (field) =>
            field !== "status",
        );

      /*
       * Record ordinary field changes.
       */
      if (
        ordinaryFields.length > 0
      ) {
        await tx
          .insert(
            leadTimelineEvents,
          )
          .values({
            organizationId:
              context.organizationId,

            leadId:
              updatedLead.id,

            createdByMembershipId:
              context.membershipId,

            eventType:
              "updated",

            title:
              "Lead updated",

            metadata: {
              fields:
                ordinaryFields,
            },
          });
      }

      /*
       * Record status changes separately.
       */
      if (
        statusChanged &&
        input.status
      ) {
        await tx
          .insert(
            leadTimelineEvents,
          )
          .values({
            organizationId:
              context.organizationId,

            leadId:
              updatedLead.id,

            createdByMembershipId:
              context.membershipId,

            eventType:
              "status_changed",

            title:
              "Lead status changed",

            description:
              `${expectedStatus} → ${input.status}`,

            metadata: {
              fromStatus:
                expectedStatus,

              toStatus:
                input.status,
            },
          });
      }

      return updatedLead;
    },
  );
}

  async create(
    context: CreateLeadContext,
    input: CreateLeadInput,
  ) {
    return this.database.db.transaction(
      async (tx) => {
        const [lead] =
          await tx
            .insert(leads)
            .values({
              organizationId:
                context.organizationId,

              title:
                input.title,

              firstName:
                input.firstName,

              lastName:
                input.lastName,

              email:
                input.email,

              phone:
                input.phone,

              leadType:
                input.leadType,

              status:
                input.status ??
                "new",

              source:
                input.source,

              sourceDetails:
                input.sourceDetails,

              notes:
                input.notes,

              metadata:
                input.metadata,
            })
            .returning();

        if (!lead) {
          throw new Error(
            "Lead insert did not return a record",
          );
        }

        await tx
          .insert(
            leadTimelineEvents,
          )
          .values({
            organizationId:
              context.organizationId,

            leadId: lead.id,

            createdByMembershipId:
              context.membershipId,

            eventType:
              "created",

            title:
              "Lead created",

            metadata: {
              source: "api",
            },
          });

        return lead;
      },
    );
  }

  async findById(
    organizationId: string,
    leadId: string,
  ) {
    return this.database.db.query
      .leads.findFirst({
        where: (
          table,
          { and, eq },
        ) =>
          and(
            eq(
              table.id,
              leadId,
            ),
            eq(
              table.organizationId,
              organizationId,
            ),
            isNull(
              table.archivedAt,
            ),
          ),
      });
  }

  async list(
    organizationId: string,
    query: ListLeadsQuery,
  ) {
    return this.database.db.query
      .leads.findMany({
        where: (
          table,
          { and, eq },
        ) =>
          and(
            eq(
              table.organizationId,
              organizationId,
            ),

            isNull(
              table.archivedAt,
            ),

            query.status
              ? eq(
                  table.status,
                  query.status,
                )
              : undefined,

            query.leadType
              ? eq(
                  table.leadType,
                  query.leadType,
                )
              : undefined,

            query.source
              ? eq(
                  table.source,
                  query.source,
                )
              : undefined,
          ),

        orderBy: (
          table,
          { desc },
        ) => [
          desc(table.createdAt),
        ],

        limit: query.limit,

        offset:
          query.offset,
      });
  }
}