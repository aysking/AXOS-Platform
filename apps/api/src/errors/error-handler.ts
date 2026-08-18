import type {
  FastifyInstance,
} from "fastify";

import { ZodError } from "zod";

import {
  AppError,
} from "./app-error.js";

export function registerErrorHandler(
  app: FastifyInstance,
) {
  app.setErrorHandler(
    (error, request, reply) => {
      if (error instanceof ZodError) {
        return reply
          .code(400)
          .send({
            error: {
              code: "VALIDATION_ERROR",
              message:
                "Request validation failed",
              details:
                error.flatten(),
            },
          });
      }

      if (error instanceof AppError) {
        return reply
          .code(error.statusCode)
          .send({
            error: {
              code: error.code,
              message: error.message,
              ...(error.details !==
              undefined
                ? {
                    details:
                      error.details,
                  }
                : {}),
            },
          });
      }

      /*
      * Preserve Fastify HTTP errors such as:
      *
      * 400 Bad Request
      * 404 Not Found
      * 415 Unsupported Media Type
      *
      * Fastify errors expose a statusCode even though
      * they are not AXOS AppError instances.
      */
      if (
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
      ) {
        request.log.warn(
          {
            statusCode:
              error.statusCode,

            code:
              "code" in error
                ? error.code
                : undefined,

            message:
              error instanceof Error
                ? error.message
                : "Request error",
          },
          "Fastify request error",
        );

        return reply
          .code(error.statusCode)
          .send({
            error: {
              code:
                "code" in error &&
                typeof error.code === "string"
                  ? error.code
                  : "REQUEST_ERROR",

              message:
                error instanceof Error
                  ? error.message
                  : "Request error",
            },
          });
      }

      request.log.error(
        error,
        "Unhandled application error",
      );

      return reply
        .code(500)
        .send({
          error: {
            code: "INTERNAL_ERROR",
            message:
              "An unexpected error occurred",
          },
        });
    },
  );
}