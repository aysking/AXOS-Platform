import type {
  FastifyPluginAsync,
} from "fastify";

import type {
  DatabaseConnection,
} from "@axos/database";

import {
  getRequestContext,
} from "../context/request-context.js";

import {
  LeadRepository,
} from "../repositories/lead.repository.js";

import {
  createLeadSchema,
  leadIdParamsSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "../schemas/lead.schema.js";

import {
  LeadService,
} from "../services/lead.service.js";

interface LeadRoutesOptions {
  database:
    DatabaseConnection;
}



export const leadRoutes:
  FastifyPluginAsync<
    LeadRoutesOptions
  > = async (
    app,
    options,
  ) => {
    const repository =
      new LeadRepository(
        options.database,
      );

    const service =
      new LeadService(
        repository,
      );

  app.patch(
  "/leads/:id",
  async (
    request,
    reply,
  ) => {
    const context =
      getRequestContext(
        request,
      );

    const params =
      leadIdParamsSchema.parse(
        request.params,
      );

    const input =
      updateLeadSchema.parse(
        request.body,
      );

    const lead =
      await service.update(
        context,
        params.id,
        input,
      );

    return reply.send({
      data: lead,
      });
    },
  );

    app.post(
      "/leads",
      async (
        request,
        reply,
      ) => {
        const context =
          getRequestContext(
            request,
          );

        const input =
          createLeadSchema.parse(
            request.body,
          );

        const lead =
          await service.create(
            context,
            input,
          );

        return reply
          .code(201)
          .send({
            data: lead,
          });
      },
    );

    app.get(
      "/leads",
      async (request) => {
        const context =
          getRequestContext(
            request,
          );

        const query =
          listLeadsQuerySchema.parse(
            request.query,
          );

        const result =
          await service.list(
            context,
            query,
          );

        return {
          data:
            result.items,

          pagination:
            result.pagination,
        };
      },
    );

    app.get(
      "/leads/:id",
      async (request) => {
        const context =
          getRequestContext(
            request,
          );

        const params =
          leadIdParamsSchema.parse(
            request.params,
          );

        const lead =
          await service.getById(
            context,
            params.id,
          );

        return {
          data: lead,
        };
      },
    );
  };