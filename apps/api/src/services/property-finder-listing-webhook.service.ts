import {
  AppError,
} from "../errors/app-error.js";

import type {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import {
  mapPropertyFinderListing,
} from "../integrations/property-finder/property-finder-listing.mapper.js";

import type {
  PropertyFinderListingWebhookEvent,
} from "../integrations/property-finder/property-finder.types.js";

import type {
  ListingRepository,
} from "../repositories/listing.repository.js";

export class PropertyFinderListingWebhookService {
  constructor(
    private readonly client:
      PropertyFinderClient,

    private readonly repository:
      ListingRepository,
  ) {}

  async process(
    organizationId: string,
    event:
      PropertyFinderListingWebhookEvent,
  ) {
    if (
      event.entity?.type !==
      "listing"
    ) {
      throw new AppError(
        "Property Finder webhook entity is not a Listing",
        {
          statusCode: 400,

          code:
            "INVALID_PROPERTY_FINDER_LISTING_WEBHOOK_ENTITY",
        },
      );
    }

    const externalListingId =
      String(
        event.entity.id,
      );

    const occurredAt =
      new Date(
        event.timestamp,
      );

    if (
      Number.isNaN(
        occurredAt.getTime(),
      )
    ) {
      throw new AppError(
        "Invalid Property Finder webhook timestamp",
        {
          statusCode: 400,

          code:
            "INVALID_PROPERTY_FINDER_WEBHOOK_TIMESTAMP",
        },
      );
    }

    /*
     * --------------------------------------------------
     * LISTING PUBLISHED
     * --------------------------------------------------
     *
     * PF intentionally sends only the listing ID.
     * Fetch the full listing before storing it.
     */

    if (
      event.type ===
      "listing.published"
    ) {
      const remoteListing =
        await this.client
          .getListingById(
            externalListingId,
          );

      if (!remoteListing) {
        throw new AppError(
          "Published Property Finder listing could not be fetched",
          {
            statusCode: 502,

            code:
              "PROPERTY_FINDER_PUBLISHED_LISTING_NOT_FOUND",

            details: {
              externalListingId,
            },
          },
        );
      }

      const mapped =
        mapPropertyFinderListing(
          remoteListing,
        );

      /*
       * lastSyncedAt should represent when AXOS actually
       * refreshed this row, not the provider event time.
       *
       * This also protects it from concurrent stale-listing
       * cleanup performed by a full listing sync.
       */
      const processedAt =
        new Date();

      const listing =
        await this.repository
          .upsertPropertyFinderListing(
            organizationId,
            mapped,
            processedAt,
          );

      const inquiriesReconciled =
        await this.repository
          .reconcilePropertyFinderListingLinks(
            organizationId,
            listing,
          );

      return {
        eventId:
          event.id,

        eventType:
          event.type,

        externalListingId,

        listingId:
          listing.id,

        action:
          "listing_upserted" as const,

        inquiriesReconciled,
      };
    }

    /*
     * --------------------------------------------------
     * LISTING UNPUBLISHED
     * --------------------------------------------------
     *
     * Preserve the row and all historical relationships.
     * Only the current live state changes.
     */

    const listing =
      await this.repository
        .markPropertyFinderListingUnpublished(
          organizationId,
          externalListingId,
          occurredAt,
        );

    const inquiriesReconciled =
      listing
        ? await this.repository
            .reconcilePropertyFinderListingLinks(
              organizationId,
              listing,
            )
        : 0;

    return {
      eventId:
        event.id,

      eventType:
        event.type,

      externalListingId,

      listingId:
        listing?.id ??
        null,

      action:
        listing
          ? "listing_unpublished"
          : "listing_not_found",

      inquiriesReconciled,
    };
  }
}