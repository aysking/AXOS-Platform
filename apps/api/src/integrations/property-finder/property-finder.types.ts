export interface PropertyFinderAuthResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface PropertyFinderPagination {
  total?: number;
  page?: number;
  perPage?: number;
  totalPages?: number;
  nextPage?: number | null;
  prevPage?: number | null;
}

export interface PropertyFinderListing {
  id: string;

  reference?: string | null;

  assignedTo?: {
    id?: string | number | null;
    name?: string | null;
    photos?: {
      thumbnail?: string | null;
    } | null;
  } | null;

  title?: {
    en?: string | null;
    ar?: string | null;
  } | null;

  description?: {
    en?: string | null;
    ar?: string | null;
  } | null;

  category?: string | null;

  type?: string | null;

  projectStatus?: string | null;

  bedrooms?: string | null;

  bathrooms?: string | null;

  size?: number | null;

  builtUpArea?: number | null;

  location?: {
    id?: string | number | null;
  } | null;

  uaeEmirate?: string | null;

  unitNumber?: string | null;

  floorNumber?: string | null;

  parkingSlots?: number | null;

  developer?: string | null;

  furnishingType?: string | null;

  finishingType?: string | null;

  availableFrom?: string | null;

  price?: {
    type?: string | null;

    amounts?: {
      sale?: number | null;
      yearly?: number | null;
      monthly?: number | null;
      weekly?: number | null;
      daily?: number | null;

      [key: string]:
        | number
        | null
        | undefined;
    } | null;
  } | null;

  state?: {
    type?: string | null;
    stage?: string | null;

    reasons?: Array<{
      en?: string | null;
      ar?: string | null;
    }> | null;
  } | null;

  portals?: {
    propertyfinder?: {
      isLive?: boolean | null;
      name?: string | null;
      publishedAt?: string | null;
    } | null;
  } | null;

  verificationStatus?: string | null;

  compliance?: {
    listingAdvertisementNumber?:
      string | null;

    issuingClientLicenseNumber?:
      string | null;
  } | null;

  media?: {
    images?: Array<{
      original?: {
        url?: string | null;
      } | null;

      watermarked?: {
        url?: string | null;
      } | null;

      large?: {
        url?: string | null;
      } | null;

      medium?: {
        url?: string | null;
      } | null;

      thumbnail?: {
        url?: string | null;
      } | null;
    }> | null;
  } | null;

  createdAt?: string | null;

  updatedAt?: string | null;

  /*
   * Property Finder adds fields periodically.
   * Preserve unknown values in rawPayload rather than
   * rejecting the entire object.
   */
  [key: string]: unknown;
}

export interface PropertyFinderListingSearchResponse {
  results: PropertyFinderListing[];

  pagination?: PropertyFinderPagination;
}

/*
 * ============================================================
 * PROPERTY FINDER LEADS
 * ============================================================
 */

export interface PropertyFinderLeadContact {
  type: string;
  value: string;
}

export interface PropertyFinderLead {
  id: string;

  entityType?:
    | "listing"
    | "project"
    | "developer"
    | "agent"
    | "company"
    | string
    | null;

  channel?:
    | "whatsapp"
    | "email"
    | "call"
    | string
    | null;

  status?:
    | "sent"
    | "delivered"
    | "read"
    | "replied"
    | string
    | null;

  enrichment?:
    Record<string, unknown>
    | null;

  distributionType?:
    string
    | null;

  publicProfile?: {
    id?:
      string
      | number
      | null;
  } | null;

  sender?: {
    name?:
      string
      | null;

    contacts?:
      PropertyFinderLeadContact[]
      | null;
  } | null;

  responseLink?:
    string
    | null;

  listing?: {
    id?:
      string
      | null;

    reference?:
      string
      | null;
  } | null;

  project?: {
    id?:
      string
      | null;
  } | null;

  developer?: {
    id?:
      string
      | null;
  } | null;

  call?: {
    talkTime?:
      number
      | null;

    waitTime?:
      number
      | null;

    recordFile?:
      string
      | null;
  } | null;

  tags?:
    string[]
    | null;

  createdAt?:
    string
    | null;

  /*
   * Preserve future PF fields.
   */
  [key: string]: unknown;
}

export interface PropertyFinderLeadSearchResponse {
  data:
    PropertyFinderLead[];

  pagination?:
    PropertyFinderPagination;
}

/*
 * ============================================================
 * PROPERTY FINDER WEBHOOKS
 * ============================================================
 */

export type PropertyFinderLeadWebhookEventType =
  | "lead.created"
  | "lead.updated"
  | "lead.assigned";

export interface PropertyFinderLeadWebhookPayload {
  channel?:
    string | null;

  status?:
    string | null;

  entityType?:
    string | null;

  distributionType?:
    string | null;

  enrichment?:
    Record<string, unknown>
    | null;

  publicProfile?: {
    id?:
      string
      | number
      | null;
  } | null;

  sender?: {
    name?:
      string
      | null;

    contacts?:
      PropertyFinderLeadContact[]
      | null;
  } | null;

  responseLink?:
    string
    | null;

  listing?: {
    id?:
      string
      | null;

    reference?:
      string
      | null;
  } | null;

  project?: {
    id?:
      string
      | null;
  } | null;

  developer?: {
    id?:
      string
      | null;
  } | null;

  call?: {
    talkTime?:
      number
      | null;

    waitTime?:
      number
      | null;

    recordFile?:
      string
      | null;
  } | null;

  tags?:
    string[]
    | null;
}

export interface PropertyFinderLeadWebhookEvent {
  id: string;

  type:
    PropertyFinderLeadWebhookEventType;

  timestamp: string;

  entity: {
    id: string;
    type: string;
  };

  payload:
    PropertyFinderLeadWebhookPayload;
}

export interface PropertyFinderWebhookSubscription {
  eventId: string;

  callbackUrl?:
    string | null;

  /*
   * Keep this temporarily for compatibility
   * in case PF returns the older/alternate field.
   */
  url?:
    string | null;

  createdAt?:
    string | null;
}

export interface PropertyFinderWebhookListResponse {
  data:
    PropertyFinderWebhookSubscription[];
}

export type PropertyFinderListingWebhookEventType =
  | "listing.published"
  | "listing.unpublished";

export type PropertyFinderWebhookEventType =
  | PropertyFinderLeadWebhookEventType
  | PropertyFinderListingWebhookEventType;

export type PropertyFinderWebhookEvent =
  | PropertyFinderLeadWebhookEvent
  | PropertyFinderListingWebhookEvent;

export interface PropertyFinderListingWebhookEvent {
  id: string;

  type:
    PropertyFinderListingWebhookEventType;

  timestamp: string;

  entity: {
    id: string;
    type: "listing";
  };

  payload:
    Record<string, never>;
}