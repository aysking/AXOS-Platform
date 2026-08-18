import type {
  PropertyFinderLead,
  PropertyFinderLeadWebhookEvent,
} from "./property-finder.types.js";

import {
  mapPropertyFinderLead,
} from "./property-finder-lead.mapper.js";

export function mapPropertyFinderLeadWebhook(
  event:
    PropertyFinderLeadWebhookEvent,
) {
  const payload =
    event.payload;

  /*
   * Transform the webhook envelope into exactly
   * the same shape used by the polling importer.
   *
   * This allows polling and webhooks to share
   * one normalization/import pipeline.
   */
  const lead:
    PropertyFinderLead = {
    /*
     * PF webhook entity.id identifies the Lead.
     */
    id:
      String(
        event.entity.id,
      ),

    entityType:
      payload.entityType ??
      null,

    channel:
      payload.channel ??
      null,

    status:
      payload.status ??
      null,

    distributionType:
      payload.distributionType ??
      null,

    enrichment:
      payload.enrichment ??
      null,

    publicProfile:
      payload.publicProfile ??
      null,

    sender:
      payload.sender ?? {
        name: null,
        contacts: [],
      },

    responseLink:
      payload.responseLink ??
      null,

    listing:
      payload.listing ??
      null,

    project:
      payload.project ??
      null,

    developer:
      payload.developer ??
      null,

    call:
      payload.call ??
      null,

    tags:
      payload.tags ??
      [],

    /*
     * Use event time as provider activity time.
     */
    createdAt:
      event.timestamp,

    /*
     * Preserve webhook metadata in rawPayload.
     */
    webhookEvent: {
      id:
        event.id,

      type:
        event.type,

      timestamp:
        event.timestamp,
    },
  };

  return mapPropertyFinderLead(
    lead,
  );
}