import type {
  AxosRequestContext,
} from "../context/request-context.js";

import {
  ConflictError,
  NotFoundError,
} from "../errors/app-error.js";

import type {
  LeadRepository,
} from "../repositories/lead.repository.js";

import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from "../schemas/lead.schema.js";

type LeadStatus =
  | "new"
  | "active"
  | "qualified"
  | "offer"
  | "converted"
  | "lost"
  | "closed";

const allowedStatusTransitions:
  Record<
    LeadStatus,
    readonly LeadStatus[]
  > = {
    new: [
      "active",
      "qualified",
      "lost",
      "closed",
    ],

    active: [
      "qualified",
      "offer",
      "lost",
      "closed",
    ],

    qualified: [
      "active",
      "offer",
      "converted",
      "lost",
      "closed",
    ],

    offer: [
      "qualified",
      "converted",
      "lost",
      "closed",
    ],

    /*
     * Terminal states are locked for now.
     *
     * Reopening will later require an
     * explicit permission/workflow.
     */
    converted: [],
    lost: [],
    closed: [],
  };

export class LeadService {
  constructor(
    private readonly repository:
      LeadRepository,
  ) {}

  async update(
  context:
    AxosRequestContext,
  leadId: string,
  input:
    UpdateLeadInput,
) {
  const existing =
    await this.repository.findById(
      context.organizationId,
      leadId,
    );

  if (!existing) {
    throw new NotFoundError(
      "Lead not found",
    );
  }

  if (
    input.status &&
    input.status !==
      existing.status
  ) {
    const allowed =
      allowedStatusTransitions[
        existing.status
      ];

    if (
      !allowed.includes(
        input.status,
      )
    ) {
      throw new ConflictError(
        "Lead status transition is not allowed",
        {
          currentStatus:
            existing.status,

          requestedStatus:
            input.status,

          allowedStatuses:
            allowed,
        },
      );
    }
  }

  const updated =
    await this.repository.update(
      {
        organizationId:
          context.organizationId,

        membershipId:
          context.membershipId,
      },
      leadId,
      input,
      existing.status,
    );

  if (!updated) {
    throw new ConflictError(
      "Lead changed while the update was being processed. Retry the request.",
    );
  }

  return updated;
}

  async create(
    context:
      AxosRequestContext,
    input:
      CreateLeadInput,
  ) {
    return this.repository.create(
      {
        organizationId:
          context.organizationId,

        membershipId:
          context.membershipId,
      },
      input,
    );
  }

  async getById(
    context:
      AxosRequestContext,
    leadId: string,
  ) {
    const lead =
      await this.repository.findById(
        context.organizationId,
        leadId,
      );

    if (!lead) {
      throw new NotFoundError(
        "Lead not found",
      );
    }

    return lead;
  }

  async list(
    context:
      AxosRequestContext,
    query:
      ListLeadsQuery,
  ) {
    const items =
      await this.repository.list(
        context.organizationId,
        query,
      );

    return {
      items,

      pagination: {
        limit:
          query.limit,

        offset:
          query.offset,

        count:
          items.length,
      },
    };
  }
}