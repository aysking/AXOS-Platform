import type {
  PropertyFinderClient,
} from "../integrations/property-finder/property-finder.client.js";

import {
  mapPropertyFinderListing,
} from "../integrations/property-finder/property-finder-listing.mapper.js";

import type {
  ListingRepository,
} from "../repositories/listing.repository.js";

export interface PropertyFinderListingResolution {
  listingId:
    string | null;

  externalListingId:
    string | null;

  reference:
    string | null;

  resolution:
    | "local_external_id"
    | "local_reference"
    | "fetched"
    | "unresolved";

  inquiriesReconciled:
    number;
}

export class PropertyFinderListingResolverService {
  constructor(
    private readonly client:
      PropertyFinderClient,

    private readonly repository:
      ListingRepository,
  ) {}

  async resolveForLead(
    organizationId:
      string,

    externalListingId:
      string | null,

    externalListingReference:
      string | null,
  ): Promise<
    PropertyFinderListingResolution
  > {
    /*
     * --------------------------------------------------
     * 1. LOCAL EXACT ID
     * --------------------------------------------------
     */

    if (externalListingId) {
      const localById =
        await this.repository
          .findPropertyFinderListingByExternalId(
            organizationId,
            externalListingId,
          );

      if (localById) {
        return {
          listingId:
            localById.id,

          externalListingId:
            localById.externalId,

          reference:
            localById.reference,

          resolution:
            "local_external_id",

          inquiriesReconciled:
            0,
        };
      }
    }

    /*
     * --------------------------------------------------
     * 2. LOCAL BROKERAGE REFERENCE
     * --------------------------------------------------
     *
     * This remains useful for older / incomplete portal
     * events that may not contain a provider listing ID.
     */

    if (externalListingReference) {
      const localByReference =
        await this.repository
          .findPropertyFinderListingByReference(
            organizationId,
            externalListingReference,
          );

      if (localByReference) {
        return {
          listingId:
            localByReference.id,

          externalListingId:
            localByReference.externalId,

          reference:
            localByReference.reference,

          resolution:
            "local_reference",

          inquiriesReconciled:
            0,
        };
      }
    }

    /*
     * --------------------------------------------------
     * 3. PROVIDER FETCH
     * --------------------------------------------------
     *
     * We cannot fetch a listing from Property Finder
     * without its provider-owned listing ID.
     */

    if (!externalListingId) {
      return {
        listingId:
          null,

        externalListingId:
          null,

        reference:
          externalListingReference,

        resolution:
          "unresolved",

        inquiriesReconciled:
          0,
      };
    }

    const remoteListing =
      await this.client
        .getListingById(
          externalListingId,
        );

    if (!remoteListing) {
      return {
        listingId:
          null,

        externalListingId,

        reference:
          externalListingReference,

        resolution:
          "unresolved",

        inquiriesReconciled:
          0,
      };
    }

    /*
     * --------------------------------------------------
     * 4. NORMALIZE + UPSERT
     * --------------------------------------------------
     */

    const mapped =
      mapPropertyFinderListing(
        remoteListing,
      );

    const resolvedAt =
      new Date();

    const savedListing =
      await this.repository
        .upsertPropertyFinderListing(
          organizationId,
          mapped,
          resolvedAt,
        );

    /*
     * --------------------------------------------------
     * 5. REPAIR OLDER UNRESOLVED INQUIRIES
     * --------------------------------------------------
     *
     * This is important.
     *
     * The listing may have been missing when an earlier
     * Lead webhook arrived.
     */

    const inquiriesReconciled =
      await this.repository
        .reconcilePropertyFinderListingLinks(
          organizationId,
          savedListing,
        );

    return {
      listingId:
        savedListing.id,

      externalListingId:
        savedListing.externalId,

      reference:
        savedListing.reference,

      resolution:
        "fetched",

      inquiriesReconciled,
    };
  }
}