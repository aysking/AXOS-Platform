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