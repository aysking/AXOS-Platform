import {
  ListingRepository,
} from "../repositories/listing.repository.js";

import {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import {
  mapPropertyFinderListing,
} from "../integrations/property-finder/property-finder-listing.mapper.js";

export class PropertyFinderListingSyncService {
  constructor(
    private readonly client:
      PropertyFinderClient,

    private readonly repository:
      ListingRepository,
  ) {}

  async sync(
    organizationId: string,
  ) {
    const syncStartedAt =
      new Date();

    const perPage = 100;

    let page = 1;

    let listingsProcessed = 0;

    let totalPages:
      | number
      | null = null;

    /*
     * Do not deactivate stale listings until
     * every page has completed successfully.
     */
    while (true) {
      const response =
        await this.client
          .searchLiveListings({
            page,
            perPage,
          });

      const items =
        response.results ??
        [];

      for (
        const item of items
      ) {
        const mapped =
          mapPropertyFinderListing(
            item,
          );

        const listing =
          await this.repository
            .upsertPropertyFinderListing(
              organizationId,
              mapped,
              syncStartedAt,
            );

        await this.repository
          .reconcilePropertyFinderListingLinks(
            organizationId,
            listing,
          );

        listingsProcessed += 1;
      }

      if (
        typeof response
          .pagination
          ?.totalPages ===
        "number"
      ) {
        totalPages =
          response.pagination
            .totalPages;
      }

      /*
       * Preferred termination:
       * use PF pagination metadata.
       */
      if (
        totalPages !== null &&
        page >= totalPages
      ) {
        break;
      }

      /*
       * Defensive fallback if pagination
       * metadata is unexpectedly absent.
       */
      if (
        items.length <
        perPage
      ) {
        break;
      }

      page += 1;
    }

    /*
     * We reached this point only if every
     * Property Finder request succeeded.
     */
    const listingsDeactivated =
      await this.repository
        .markStalePropertyFinderListingsInactive(
          organizationId,
          syncStartedAt,
        );

    return {
      provider:
        "property_finder",

      syncStartedAt,

      syncCompletedAt:
        new Date(),

      listingsProcessed,

      listingsDeactivated,

      pagesProcessed:
        page,
    };
  }
}