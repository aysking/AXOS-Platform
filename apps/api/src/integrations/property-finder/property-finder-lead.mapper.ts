import type {
  PropertyFinderLead,
} from "./property-finder.types.js";

import {
  normalizePropertyFinderContacts,
  type NormalizedLeadContact,
} from "./property-finder-contact.utils.js";

export interface MappedPropertyFinderLead {
  externalInquiryId: string;

  externalEntityType:
    string | null;

  channel:
    string | null;

  providerStatus:
    string | null;

  distributionType:
    string | null;

  externalPublicProfileId:
    string | null;

  senderName:
    string | null;

  senderContacts: unknown;

  normalizedContacts:
    NormalizedLeadContact[];

  responseLink:
    string | null;

  externalListingId:
    string | null;

  externalListingReference:
    string | null;

  externalProjectId:
    string | null;

  externalDeveloperId:
    string | null;

  callTalkTimeSeconds:
    number | null;

  callWaitTimeSeconds:
    number | null;

  callRecordingUrl:
    string | null;

  tags:
    string[];

  enrichment:
    Record<string, unknown>
    | null;

  providerCreatedAt:
    Date | null;

  rawPayload:
    PropertyFinderLead;
}

function parseDate(
  value:
    string
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

export function mapPropertyFinderLead(
  lead:
    PropertyFinderLead,
): MappedPropertyFinderLead {
  const rawContacts =
    lead.sender?.contacts ??
    [];

  return {
    externalInquiryId:
      String(lead.id),

    externalEntityType:
      lead.entityType ??
      null,

    channel:
      lead.channel ??
      null,

    providerStatus:
      lead.status ??
      null,

    distributionType:
      lead.distributionType ??
      null,

    externalPublicProfileId:
      lead.publicProfile?.id !==
        null &&
      lead.publicProfile?.id !==
        undefined
        ? String(
            lead.publicProfile.id,
          )
        : null,

    senderName:
      lead.sender?.name?.trim() ||
      null,

    senderContacts:
      rawContacts,

    normalizedContacts:
      normalizePropertyFinderContacts(
        rawContacts,
      ),

    responseLink:
      lead.responseLink ??
      null,

    externalListingId:
      lead.listing?.id ??
      null,

    externalListingReference:
      lead.listing?.reference ??
      null,

    externalProjectId:
      lead.project?.id ??
      null,

    externalDeveloperId:
      lead.developer?.id ??
      null,

    callTalkTimeSeconds:
      lead.call?.talkTime ??
      null,

    callWaitTimeSeconds:
      lead.call?.waitTime ??
      null,

    callRecordingUrl:
      lead.call?.recordFile ??
      null,

    tags:
      lead.tags ??
      [],

    enrichment:
      lead.enrichment ??
      null,

    providerCreatedAt:
      parseDate(
        lead.createdAt,
      ),

    rawPayload:
      lead,
  };
}