import {
  and,
  eq,
  lt,
} from "drizzle-orm";

import {
  listings,
  type DatabaseConnection,
} from "@axos/database";

import type {
  PropertyFinderListingValues,
} from "../integrations/property-finder/property-finder-listing.mapper.js";

export class ListingRepository {
  constructor(
    private readonly database:
      DatabaseConnection,
  ) {}

  async upsertPropertyFinderListing(
    organizationId: string,
    input:
      PropertyFinderListingValues,
    syncStartedAt: Date,
  ) {
    const values = {
      organizationId,

      ...input,

      lastSyncedAt:
        syncStartedAt,

      updatedAt:
        new Date(),
    };

    const [result] =
      await this.database.db
        .insert(listings)
        .values(values)
        .onConflictDoUpdate({
          target: [
            listings.organizationId,
            listings.provider,
            listings.externalId,
          ],

          set: {
            reference:
              input.reference,

            externalAssignedToId:
              input.externalAssignedToId,

            externalAssignedToName:
              input.externalAssignedToName,

            titleEn:
              input.titleEn,

            titleAr:
              input.titleAr,

            descriptionEn:
              input.descriptionEn,

            descriptionAr:
              input.descriptionAr,

            category:
              input.category,

            offeringType:
              input.offeringType,

            propertyType:
              input.propertyType,

            projectStatus:
              input.projectStatus,

            bedrooms:
              input.bedrooms,

            bathrooms:
              input.bathrooms,

            size:
              input.size,

            builtUpArea:
              input.builtUpArea,

            externalLocationId:
              input.externalLocationId,

            uaeEmirate:
              input.uaeEmirate,

            unitNumber:
              input.unitNumber,

            floorNumber:
              input.floorNumber,

            parkingSlots:
              input.parkingSlots,

            developer:
              input.developer,

            furnishingType:
              input.furnishingType,

            finishingType:
              input.finishingType,

            availableFrom:
              input.availableFrom,

            priceAmount:
              input.priceAmount,

            priceType:
              input.priceType,

            currency:
              input.currency,

            stateType:
              input.stateType,

            stateStage:
              input.stateStage,

            isLive:
              input.isLive,

            publishedAt:
              input.publishedAt,

            deactivatedAt:
              input.deactivatedAt,

            verificationStatus:
              input.verificationStatus,

            advertisementNumber:
              input.advertisementNumber,

            issuingClientLicenseNumber:
              input.issuingClientLicenseNumber,

            primaryImageUrl:
              input.primaryImageUrl,

            providerCreatedAt:
              input.providerCreatedAt,

            providerUpdatedAt:
              input.providerUpdatedAt,

            lastSyncedAt:
              syncStartedAt,

            rawPayload:
              input.rawPayload,

            updatedAt:
              new Date(),
          },
        })
        .returning();

    return result;
  }

  async markStalePropertyFinderListingsInactive(
    organizationId: string,
    syncStartedAt: Date,
  ) {
    const now =
      new Date();

    const rows =
      await this.database.db
        .update(listings)
        .set({
          isLive: false,

          deactivatedAt:
            now,

          updatedAt:
            now,
        })
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
              listings.isLive,
              true,
            ),

            lt(
              listings.lastSyncedAt,
              syncStartedAt,
            ),
          ),
        )
        .returning({
          id: listings.id,
        });

    return rows.length;
  }
}