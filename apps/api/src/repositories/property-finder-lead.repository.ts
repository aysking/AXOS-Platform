import {
  and,
  eq,
  isNull,
  sql,
} from "drizzle-orm";

import {
  leadContactMethods,
  leadInquiries,
  leadListings,
  leads,
  leadTimelineEvents,
  listings,
  statusDefinitions,
  type DatabaseConnection,
} from "@axos/database";

import {
  AppError,
} from "../errors/app-error.js";

import type {
  MappedPropertyFinderLead,
} from "../integrations/property-finder/property-finder-lead.mapper.js";

export interface PropertyFinderLeadImportResult {
  externalInquiryId:
    string;

  inquiryCreated:
    boolean;

  inquiryUpdated:
    boolean;

  leadId:
    string;

  leadCreated:
    boolean;

  leadMatched:
    boolean;

  ambiguousMatch:
    boolean;

  listingId:
    string | null;
}

export class PropertyFinderLeadRepository {
  constructor(
    private readonly database:
      DatabaseConnection,
  ) {}

  async importLead(
    organizationId: string,
    input:
      MappedPropertyFinderLead,
  ): Promise<
    PropertyFinderLeadImportResult
  > {
    return this.database.db
      .transaction(
        async (tx) => {
          const now =
            new Date();

          /*
           * --------------------------------------------------
           * RESOLVE AXOS LISTING
           * --------------------------------------------------
           */

          let listing:
            typeof listings.$inferSelect
            | undefined;

          if (
            input.externalListingId
          ) {
            const [found] =
              await tx
                .select()
                .from(listings)
                .where(
                  and(
                    eq(
                      listings.organizationId,
                      organizationId,
                    ),

                    eq(
                      listings.provider,
                      "property_finder",
                    ),

                    eq(
                      listings.externalId,
                      input.externalListingId,
                    ),
                  ),
                )
                .limit(1);

            listing =
              found;
          }

          /*
           * Some portal events may resolve only by
           * the brokerage reference.
           */
          if (
            !listing &&
            input.externalListingReference
          ) {
            const [found] =
              await tx
                .select()
                .from(listings)
                .where(
                  and(
                    eq(
                      listings.organizationId,
                      organizationId,
                    ),

                    eq(
                      listings.provider,
                      "property_finder",
                    ),

                    eq(
                      listings.reference,
                      input.externalListingReference,
                    ),
                  ),
                )
                .limit(1);

            listing =
              found;
          }

          /*
           * --------------------------------------------------
           * INQUIRY IDEMPOTENCY
           * --------------------------------------------------
           *
           * Property Finder lead.id represents the
           * external inquiry event.
           */

          const [existingInquiry] =
            await tx
              .select({
                id:
                  leadInquiries.id,

                leadId:
                  leadInquiries.leadId,

                listingId:
                  leadInquiries.listingId,
              })
              .from(
                leadInquiries,
              )
              .where(
                and(
                  eq(
                    leadInquiries.organizationId,
                    organizationId,
                  ),

                  eq(
                    leadInquiries.provider,
                    "property_finder",
                  ),

                  eq(
                    leadInquiries.externalInquiryId,
                    input.externalInquiryId,
                  ),
                ),
              )
              .limit(1);

          /*
           * Existing inquiry:
           *
           * update provider-owned state without
           * creating another AXOS Lead or timeline event.
           */
          if (
            existingInquiry
          ) {
            const resolvedListingId =
              listing?.id ??
              existingInquiry.listingId ??
              null;

            await tx
              .update(
                leadInquiries,
              )
              .set({
                listingId:
                  resolvedListingId,

                externalEntityType:
                  input.externalEntityType,

                channel:
                  input.channel,

                providerStatus:
                  input.providerStatus,

                distributionType:
                  input.distributionType,

                externalPublicProfileId:
                  input.externalPublicProfileId,

                senderName:
                  input.senderName,

                senderContacts:
                  input.senderContacts,

                responseLink:
                  input.responseLink,

                externalListingId:
                  input.externalListingId,

                externalListingReference:
                  input.externalListingReference,

                externalProjectId:
                  input.externalProjectId,

                externalDeveloperId:
                  input.externalDeveloperId,

                callTalkTimeSeconds:
                  input.callTalkTimeSeconds,

                callWaitTimeSeconds:
                  input.callWaitTimeSeconds,

                callRecordingUrl:
                  input.callRecordingUrl,

                tags:
                  input.tags,

                enrichment:
                  input.enrichment,

                providerCreatedAt:
                  input.providerCreatedAt,

                rawPayload:
                  input.rawPayload,

                updatedAt:
                  now,
              })
              .where(
                eq(
                  leadInquiries.id,
                  existingInquiry.id,
                ),
              );

            if (listing) {
              await tx
                .insert(
                  leadListings,
                )
                .values({
                  organizationId,

                  leadId:
                    existingInquiry.leadId,

                  listingId:
                    listing.id,

                  linkSource:
                    "inquiry",

                  lastLinkedAt:
                    now,
                })
                .onConflictDoUpdate({
                  target: [
                    leadListings.organizationId,
                    leadListings.leadId,
                    leadListings.listingId,
                  ],

                  set: {
                    lastLinkedAt:
                      now,
                  },
                });
            }

            return {
              externalInquiryId:
                input.externalInquiryId,

              inquiryCreated:
                false,

              inquiryUpdated:
                true,

              leadId:
                existingInquiry.leadId,

              leadCreated:
                false,

              leadMatched:
                false,

              ambiguousMatch:
                false,

              listingId:
                resolvedListingId,
            };
          }

          /*
           * --------------------------------------------------
           * FIND EXISTING AXOS LEAD
           * --------------------------------------------------
           *
           * Do NOT deduplicate by name.
           *
           * Names are not sufficiently reliable identifiers.
           */

          const candidateLeadIds =
            new Set<string>();

          for (
            const contact of
              input.normalizedContacts
          ) {
            const matches =
              await tx
                .select({
                  leadId:
                    leadContactMethods.leadId,
                })
                .from(
                  leadContactMethods,
                )
                .innerJoin(
                  leads,
                  and(
                    eq(
                      leads.id,
                      leadContactMethods.leadId,
                    ),

                    eq(
                      leads.organizationId,
                      organizationId,
                    ),
                  ),
                )
                .where(
                  and(
                    eq(
                      leadContactMethods.organizationId,
                      organizationId,
                    ),

                    eq(
                      leadContactMethods.contactType,
                      contact.contactType,
                    ),

                    eq(
                      leadContactMethods.normalizedValue,
                      contact.normalizedValue,
                    ),

                    isNull(
                      leads.archivedAt,
                    ),
                  ),
                );

            for (
              const match of matches
            ) {
              candidateLeadIds.add(
                match.leadId,
              );
            }
          }

          const ambiguousMatch =
            candidateLeadIds.size >
            1;

          let leadId:
            string;

          let leadCreated =
            false;

          let leadMatched =
            false;

          /*
           * Exactly one matching Lead is safe enough
           * for automatic reuse.
           */
          if (
            candidateLeadIds.size ===
            1
          ) {
            leadId =
              Array.from(
                candidateLeadIds,
              )[0]!;

            leadMatched =
              true;
          } else {
            /*
             * ------------------------------------------------
             * CREATE NEW AXOS LEAD
             * ------------------------------------------------
             *
             * Zero matches:
             * normal new customer.
             *
             * Multiple matches:
             * intentionally create a separate Lead rather
             * than silently merging unrelated customers.
             */

            let [defaultStatus] =
              await tx
                .select({
                  id:
                    statusDefinitions.id,

                  key:
                    statusDefinitions.key,
                })
                .from(
                  statusDefinitions,
                )
                .where(
                  and(
                    eq(
                      statusDefinitions.organizationId,
                      organizationId,
                    ),

                    eq(
                      statusDefinitions.entityType,
                      "lead",
                    ),

                    eq(
                      statusDefinitions.isDefault,
                      true,
                    ),

                    eq(
                      statusDefinitions.isActive,
                      true,
                    ),
                  ),
                )
                .limit(1);

            /*
             * Safe fallback for organizations migrated
             * from the original Lead implementation.
             */
            if (
              !defaultStatus
            ) {
              [defaultStatus] =
                await tx
                  .select({
                    id:
                      statusDefinitions.id,

                    key:
                      statusDefinitions.key,
                  })
                  .from(
                    statusDefinitions,
                  )
                  .where(
                    and(
                      eq(
                        statusDefinitions.organizationId,
                        organizationId,
                      ),

                      eq(
                        statusDefinitions.entityType,
                        "lead",
                      ),

                      eq(
                        statusDefinitions.key,
                        "new",
                      ),

                      eq(
                        statusDefinitions.isActive,
                        true,
                      ),
                    ),
                  )
                  .limit(1);
            }

            if (
              !defaultStatus
            ) {
              throw new AppError(
                "No active default Lead status is configured",
                {
                  statusCode:
                    500,

                  code:
                    "LEAD_DEFAULT_STATUS_NOT_CONFIGURED",
                },
              );
            }

            const primaryEmail =
              input.normalizedContacts
                .find(
                  (contact) =>
                    contact.contactType ===
                    "email",
                );

            const primaryPhone =
              input.normalizedContacts
                .find(
                  (contact) =>
                    contact.contactType ===
                    "phone",
                );

            let leadType:
              "sales"
              | "leasing"
              | "sales_and_leasing";

            if (
              listing?.offeringType ===
              "sale"
            ) {
              leadType =
                "sales";
            } else if (
              listing?.offeringType ===
              "rent"
            ) {
              leadType =
                "leasing";
            } else if (
              input.externalEntityType ===
                "project" ||
              input.externalEntityType ===
                "developer"
            ) {
              leadType =
                "sales";
            } else {
              leadType =
                "sales_and_leasing";
            }

            const occurredAt =
              input.providerCreatedAt ??
              now;

            const [createdLead] =
              await tx
                .insert(leads)
                .values({
                  organizationId,

                  assignedToMembershipId:
                    listing
                      ?.assignedToMembershipId ??
                    null,

                  displayName:
                    input.senderName,

                  title:
                    null,

                  firstName:
                    null,

                  lastName:
                    null,

                  email:
                    primaryEmail
                      ?.value ??
                    null,

                  phone:
                    primaryPhone
                      ?.value ??
                    null,

                  leadType,

                  /*
                   * Legacy status retained temporarily.
                   */
                  status:
                    "new",

                  /*
                   * Future configurable status.
                   */
                  statusDefinitionId:
                    defaultStatus.id,

                  source:
                    "property_portal",

                  sourceDetails:
                    "Property Finder",

                  metadata: {
                    provider:
                      "property_finder",

                    firstExternalInquiryId:
                      input.externalInquiryId,

                    externalEntityType:
                      input.externalEntityType,

                    ambiguousContactMatch:
                      ambiguousMatch,
                  },

                  lastActivityAt:
                    occurredAt,
                })
                .returning({
                  id:
                    leads.id,
                });

            if (
              !createdLead
            ) {
              throw new Error(
                "Property Finder Lead insert did not return a record",
              );
            }

            leadId =
              createdLead.id;

            leadCreated =
              true;
          }

          /*
           * --------------------------------------------------
           * CONTACT METHODS
           * --------------------------------------------------
           */

          for (
            const contact of
              input.normalizedContacts
          ) {
            await tx
              .insert(
                leadContactMethods,
              )
              .values({
                organizationId,

                leadId,

                contactType:
                  contact.contactType,

                value:
                  contact.value,

                normalizedValue:
                  contact.normalizedValue,

                /*
                 * Avoid accidentally creating multiple
                 * primaries on an already-existing Lead.
                 */
                isPrimary:
                  leadCreated
                    ? contact.isPrimary
                    : false,

                source:
                  "property_finder",
              })
              .onConflictDoNothing();
          }

          /*
           * --------------------------------------------------
           * LEAD INQUIRY
           * --------------------------------------------------
           */

          const occurredAt =
            input.providerCreatedAt ??
            now;

          await tx
            .insert(
              leadInquiries,
            )
            .values({
              organizationId,

              leadId,

              listingId:
                listing?.id ??
                null,

              provider:
                "property_finder",

              externalInquiryId:
                input.externalInquiryId,

              externalEntityType:
                input.externalEntityType,

              channel:
                input.channel,

              providerStatus:
                input.providerStatus,

              distributionType:
                input.distributionType,

              externalPublicProfileId:
                input.externalPublicProfileId,

              senderName:
                input.senderName,

              senderContacts:
                input.senderContacts,

              responseLink:
                input.responseLink,

              externalListingId:
                input.externalListingId,

              externalListingReference:
                input.externalListingReference,

              externalProjectId:
                input.externalProjectId,

              externalDeveloperId:
                input.externalDeveloperId,

              callTalkTimeSeconds:
                input.callTalkTimeSeconds,

              callWaitTimeSeconds:
                input.callWaitTimeSeconds,

              callRecordingUrl:
                input.callRecordingUrl,

              tags:
                input.tags,

              enrichment:
                input.enrichment,

              providerCreatedAt:
                input.providerCreatedAt,

              rawPayload:
                input.rawPayload,
            });

          /*
           * --------------------------------------------------
           * LEAD <-> LISTING
           * --------------------------------------------------
           */

          if (listing) {
            await tx
              .insert(
                leadListings,
              )
              .values({
                organizationId,

                leadId,

                listingId:
                  listing.id,

                linkSource:
                  "inquiry",
              })
              .onConflictDoUpdate({
                target: [
                  leadListings.organizationId,
                  leadListings.leadId,
                  leadListings.listingId,
                ],

                set: {
                  lastLinkedAt:
                    now,
                },
              });
          }

          /*
           * --------------------------------------------------
           * LAST ACTIVITY
           * --------------------------------------------------
           *
           * GREATEST prevents an older imported inquiry from
           * moving last_activity_at backwards.
           */

          const occurredAtIso =
            occurredAt.toISOString();

          await tx
            .update(leads)
            .set({
              lastActivityAt:
                sql`GREATEST(
                  ${leads.lastActivityAt},
                  ${occurredAtIso}::timestamptz
                )`,

              updatedAt:
                now,
            })
            .where(
              and(
                eq(
                  leads.id,
                  leadId,
                ),

                eq(
                  leads.organizationId,
                  organizationId,
                ),
              ),
            );

          /*
           * --------------------------------------------------
           * TIMELINE
           * --------------------------------------------------
           */

          const eventType:
            | "call"
            | "email"
            | "message"
            | "custom" =
            input.channel ===
            "call"
              ? "call"
              : input.channel ===
                  "email"
                ? "email"
                : input.channel ===
                    "whatsapp"
                  ? "message"
                  : "custom";

          const description =
            input.externalListingReference
              ? `Listing ${input.externalListingReference}`
              : input.senderName
                ? `From ${input.senderName}`
                : null;

          await tx
            .insert(
              leadTimelineEvents,
            )
            .values({
              organizationId,

              leadId,

              /*
               * External system event.
               * No human membership owns creation.
               */
              createdByMembershipId:
                null,

              eventType,

              title:
                "Property Finder inquiry received",

              description,

              occurredAt,

              metadata: {
                provider:
                  "property_finder",

                externalInquiryId:
                  input.externalInquiryId,

                channel:
                  input.channel,

                providerStatus:
                  input.providerStatus,

                externalListingId:
                  input.externalListingId,

                externalListingReference:
                  input.externalListingReference,

                externalProjectId:
                  input.externalProjectId,

                externalDeveloperId:
                  input.externalDeveloperId,
              },
            });

          return {
            externalInquiryId:
              input.externalInquiryId,

            inquiryCreated:
              true,

            inquiryUpdated:
              false,

            leadId,

            leadCreated,

            leadMatched,

            ambiguousMatch,

            listingId:
              listing?.id ??
              null,
          };
        },
      );
  }
}