import type {
  listings,
} from "@axos/database";

import type {
  PropertyFinderListing,
} from "./property-finder.types.js";

export type PropertyFinderListingValues =
  Omit<
    typeof listings.$inferInsert,
    | "id"
    | "organizationId"
    | "propertyId"
    | "unitId"
    | "assignedToMembershipId"
    | "createdAt"
    | "updatedAt"
  >;

function parseDate(
  value:
    | string
    | null
    | undefined,
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function numberToNumeric(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

function getPriceAmount(
  listing:
    PropertyFinderListing,
) {
  const priceType =
    listing.price?.type;

  if (!priceType) {
    return null;
  }

  const amount =
    listing.price
      ?.amounts?.[priceType];

  if (
    amount === null ||
    amount === undefined
  ) {
    return null;
  }

  return String(amount);
}

function getOfferingType(
  priceType:
    | string
    | null
    | undefined,
) {
  if (!priceType) {
    return null;
  }

  if (priceType === "sale") {
    return "sale";
  }

  if (
    [
      "yearly",
      "monthly",
      "weekly",
      "daily",
    ].includes(priceType)
  ) {
    return "rent";
  }

  return null;
}

function getPrimaryImageUrl(
  listing:
    PropertyFinderListing,
) {
  const image =
    listing.media
      ?.images?.[0];

  if (!image) {
    return null;
  }

  return (
    image.watermarked?.url ??
    image.original?.url ??
    image.large?.url ??
    image.medium?.url ??
    image.thumbnail?.url ??
    null
  );
}

export function mapPropertyFinderListing(
  listing:
    PropertyFinderListing,
): PropertyFinderListingValues {
  const priceType =
    listing.price?.type ??
    null;

  const isLive =
    listing.portals
      ?.propertyfinder
      ?.isLive ??
    listing.state?.stage ===
      "live";

  return {
    provider:
      "property_finder",

    externalId:
      String(listing.id),

    reference:
      listing.reference ??
      null,

    externalAssignedToId:
      listing.assignedTo?.id !==
        null &&
      listing.assignedTo?.id !==
        undefined
        ? String(
            listing.assignedTo.id,
          )
        : null,

    externalAssignedToName:
      listing.assignedTo?.name ??
      null,

    titleEn:
      listing.title?.en ??
      null,

    titleAr:
      listing.title?.ar ??
      null,

    descriptionEn:
      listing.description?.en ??
      null,

    descriptionAr:
      listing.description?.ar ??
      null,

    category:
      listing.category ??
      null,

    offeringType:
      getOfferingType(
        priceType,
      ),

    propertyType:
      listing.type ??
      null,

    projectStatus:
      listing.projectStatus ??
      null,

    bedrooms:
      listing.bedrooms ??
      null,

    bathrooms:
      listing.bathrooms ??
      null,

    size:
      numberToNumeric(
        listing.size,
      ),

    builtUpArea:
      numberToNumeric(
        listing.builtUpArea,
      ),

    externalLocationId:
      listing.location?.id !==
        null &&
      listing.location?.id !==
        undefined
        ? String(
            listing.location.id,
          )
        : null,

    uaeEmirate:
      listing.uaeEmirate ??
      null,

    unitNumber:
      listing.unitNumber ??
      null,

    floorNumber:
      listing.floorNumber ??
      null,

    parkingSlots:
      listing.parkingSlots ??
      null,

    developer:
      listing.developer ??
      null,

    furnishingType:
      listing.furnishingType ??
      null,

    finishingType:
      listing.finishingType ??
      null,

    availableFrom:
      listing.availableFrom ??
      null,

    priceAmount:
      getPriceAmount(
        listing,
      ),

    /*
     * sale / yearly / monthly /
     * weekly / daily
     */
    priceType,

    currency:
      "AED",

    stateType:
      listing.state?.type ??
      null,

    stateStage:
      listing.state?.stage ??
      null,

    isLive,

    publishedAt:
      parseDate(
        listing.portals
          ?.propertyfinder
          ?.publishedAt,
      ),

    deactivatedAt:
      isLive
        ? null
        : new Date(),

    verificationStatus:
      listing.verificationStatus ??
      null,

    advertisementNumber:
      listing.compliance
        ?.listingAdvertisementNumber ??
      null,

    issuingClientLicenseNumber:
      listing.compliance
        ?.issuingClientLicenseNumber ??
      null,

    primaryImageUrl:
      getPrimaryImageUrl(
        listing,
      ),

    providerCreatedAt:
      parseDate(
        listing.createdAt,
      ),

    providerUpdatedAt:
      parseDate(
        listing.updatedAt,
      ),

    rawPayload:
      listing,
  };
}