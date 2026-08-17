export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: unknown;
    } = {},
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode =
      options.statusCode ?? 500;
    this.code =
      options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = "Resource not found",
  ) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message = "Authentication required",
  ) {
    super(message, {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "Resource conflict",
    details?: unknown,
  ) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT",
      details,
    });
  }
}