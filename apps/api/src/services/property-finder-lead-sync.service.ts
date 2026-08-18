import {
  mapPropertyFinderLead,
} from "../integrations/property-finder/property-finder-lead.mapper.js";

import type {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import type {
  PropertyFinderLeadRepository,
} from "../repositories/property-finder-lead.repository.js";

import type {
  PropertyFinderListingResolverService,
} from "./property-finder-listing-resolver.service.js";

export interface PropertyFinderLeadSyncOptions {
  lookbackDays?: number;
}

export class PropertyFinderLeadSyncService {
  constructor(
    private readonly client:
      PropertyFinderClient,

    private readonly repository:
      PropertyFinderLeadRepository,

    private readonly listingResolver:
      PropertyFinderListingResolverService,
  ) {}

  async sync(
    organizationId: string,
    options:
      PropertyFinderLeadSyncOptions = {},
  ) {
    const syncStartedAt =
      new Date();

    const lookbackDays =
      options.lookbackDays ??
      30;

    if (
      lookbackDays < 1 ||
      lookbackDays > 89
    ) {
      throw new Error(
        "Property Finder Lead lookbackDays must be between 1 and 89",
      );
    }

    /*
     * Use 89 rather than 90 for the maximum manual
     * backfill to remain safely inside PF's
     * three-month createdAtFrom restriction.
     */
    const createdAtFrom =
      new Date(
        syncStartedAt.getTime() -
          lookbackDays *
            24 *
            60 *
            60 *
            1000,
      );

    const perPage =
      50;

    let page =
      1;

    let leadsFetched =
      0;

    let inquiriesCreated =
      0;

    let inquiriesUpdated =
      0;

    let axosLeadsCreated =
      0;

    let axosLeadsReused =
      0;

    let ambiguousMatches =
      0;

    let listingLinks =
      0;

    let unresolvedListings =
      0;

    while (true) {
      const response =
        await this.client
          .searchLeads({
            page,
            perPage,

            createdAtFrom,

            createdAtTo:
              syncStartedAt,
          });

      const items =
        response.data ??
        [];

      for (
        const item of items
      ) {
        leadsFetched +=
          1;

        const mapped =
          mapPropertyFinderLead(
              item,
            );

          /*
          * Ensure the referenced listing exists locally
          * before the Lead importer attempts to link it.
          */
          if (
            mapped.externalListingId ||
            mapped.externalListingReference
          ) {
            await this.listingResolver
              .resolveForLead(
                organizationId,

                mapped.externalListingId,

                mapped.externalListingReference,
              );
          }

          const result =
            await this.repository
              .importLead(
                organizationId,
                mapped,
              );

        if (
          result.inquiryCreated
        ) {
          inquiriesCreated +=
            1;
        }

        if (
          result.inquiryUpdated
        ) {
          inquiriesUpdated +=
            1;
        }

        if (
          result.leadCreated
        ) {
          axosLeadsCreated +=
            1;
        }

        if (
          result.leadMatched
        ) {
          axosLeadsReused +=
            1;
        }

        if (
          result.ambiguousMatch
        ) {
          ambiguousMatches +=
            1;
        }

        if (
          result.listingId
        ) {
          listingLinks +=
            1;
        } else if (
          mapped.externalListingId
        ) {
          unresolvedListings +=
            1;
        }
      }

      const totalPages =
        response.pagination
          ?.totalPages;

      if (
        typeof totalPages ===
          "number" &&
        page >= totalPages
      ) {
        break;
      }

      if (
        items.length <
        perPage
      ) {
        break;
      }

      page +=
        1;
    }

    return {
      provider:
        "property_finder",

      lookbackDays,

      createdAtFrom,

      createdAtTo:
        syncStartedAt,

      syncStartedAt,

      syncCompletedAt:
        new Date(),

      pagesProcessed:
        page,

      leadsFetched,

      inquiriesCreated,

      inquiriesUpdated,

      axosLeadsCreated,

      axosLeadsReused,

      ambiguousMatches,

      listingLinks,

      unresolvedListings,
    };
  }
}