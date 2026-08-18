import {
  AppError,
} from "../../errors/app-error.js";

import type {
  PropertyFinderAuthResponse,
  PropertyFinderLeadSearchResponse,
  PropertyFinderListingSearchResponse,
} from "./property-finder.types.js";

export interface PropertyFinderClientConfig {
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
}

export class PropertyFinderClient {
  private accessToken:
    | string
    | null = null;

  private accessTokenExpiresAt = 0;

  constructor(
    private readonly config:
      PropertyFinderClientConfig,
  ) {}

  get configured() {
    return Boolean(
      this.config.apiKey &&
        this.config.apiSecret,
    );
  }

  private ensureConfigured() {
    if (!this.config.apiKey ||
        !this.config.apiSecret) {
      throw new AppError(
        "Property Finder integration is not configured",
        {
          statusCode: 503,
          code:
            "PROPERTY_FINDER_NOT_CONFIGURED",
        },
      );
    }
  }

  private getBaseUrl() {
    return this.config.baseUrl
      .replace(/\/+$/, "");
  }

  private async issueAccessToken() {
    this.ensureConfigured();

    const response =
      await this.request(
        `${this.getBaseUrl()}/v1/auth/token`,
        {
          method: "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",
          },

        body: JSON.stringify({
          apiKey:
            this.config.apiKey,

          apiSecret:
            this.config.apiSecret,
        }),
      },
    );

    if (!response.ok) {
      const body =
        await this.readErrorBody(
          response,
        );

      throw new AppError(
        "Property Finder authentication failed",
        {
          statusCode: 502,

          code:
            "PROPERTY_FINDER_AUTH_FAILED",

          details: {
            upstreamStatus:
              response.status,

            upstreamBody: body,
          },
        },
      );
    }

    const data =
      await response.json() as
        PropertyFinderAuthResponse;

    if (!data.accessToken) {
      throw new AppError(
        "Property Finder returned an invalid authentication response",
        {
          statusCode: 502,

          code:
            "PROPERTY_FINDER_INVALID_AUTH_RESPONSE",
        },
      );
    }

    this.accessToken =
      data.accessToken;

    /*
     * Refresh one minute before expiry.
     *
     * Current PF tokens normally expire after
     * 1800 seconds, but we respect the value
     * actually returned by the API.
     */
    const safetyWindowMs =
      60_000;

    this.accessTokenExpiresAt =
      Date.now() +
      data.expiresIn * 1000 -
      safetyWindowMs;

    return this.accessToken;
  }

  private async getAccessToken() {
    if (
      this.accessToken &&
      Date.now() <
        this.accessTokenExpiresAt
    ) {
      return this.accessToken;
    }

    return this.issueAccessToken();
  }

  private invalidateAccessToken() {
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
  }

  private async readErrorBody(
    response: Response,
  ) {
    try {
      return await response.json();
    } catch {
      try {
        return await response.text();
      } catch {
        return null;
      }
    }
  }

  private async authorizedGet<T>(
    path: string,
    retryAuthentication = true,
  ): Promise<T> {
    const token =
      await this.getAccessToken();

    const response =
      await this.request(
        `${this.getBaseUrl()}${path}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },
        },
    );

    /*
     * Token may have been invalidated upstream
     * before its stated expiry.
     *
     * Retry authentication once only.
     */
    if (
      response.status === 401 &&
      retryAuthentication
    ) {
      this.invalidateAccessToken();

      return this.authorizedGet<T>(
        path,
        false,
      );
    }

    if (!response.ok) {
      const body =
        await this.readErrorBody(
          response,
        );

      throw new AppError(
        "Property Finder API request failed",
        {
          statusCode: 502,

          code:
            "PROPERTY_FINDER_API_ERROR",

          details: {
            upstreamStatus:
              response.status,

            upstreamBody: body,

            path,
          },
        },
      );
    }

    return await response.json() as T;
  }

  private async request(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetch(
        url,
        init,
      );
    } catch (error) {
      throw new AppError(
        "Unable to connect to Property Finder",
        {
          statusCode: 502,

          code:
            "PROPERTY_FINDER_NETWORK_ERROR",

          details: {
            message:
              error instanceof Error
                ? error.message
                : String(error),
          },
        },
      );
    }
  }

  async searchLiveListings(
    options: {
      page?: number;
      perPage?: number;
    } = {},
  ) {
    const page =
      options.page ?? 1;

    const perPage =
      options.perPage ?? 100;

    if (
      perPage < 1 ||
      perPage > 100
    ) {
      throw new Error(
        "Property Finder listing perPage must be between 1 and 100",
      );
    }

    const params =
      new URLSearchParams();

    params.set(
      "filter[state]",
      "live",
    );

    params.set(
      "page",
      String(page),
    );

    params.set(
      "perPage",
      String(perPage),
    );

    params.set(
      "sort[publishedAt]",
      "asc",
    );

    return this.authorizedGet<
      PropertyFinderListingSearchResponse
    >(
      `/v1/listings?${params.toString()}`,
    );
  }

  async searchLeads(
    options: {
      page?: number;
      perPage?: number;
      createdAtFrom?: Date;
      createdAtTo?: Date;
    } = {},
  ) {
    const page =
      options.page ?? 1;

    const perPage =
      options.perPage ?? 50;

    if (
      perPage < 1 ||
      perPage > 50
    ) {
      throw new Error(
        "Property Finder lead perPage must be between 1 and 50",
      );
    }

    const params =
      new URLSearchParams();

    params.set(
      "page",
      String(page),
    );

    params.set(
      "perPage",
      String(perPage),
    );

    if (
      options.createdAtFrom
    ) {
      params.set(
        "createdAtFrom",
        options.createdAtFrom
          .toISOString(),
      );
    }

    if (
      options.createdAtTo
    ) {
      params.set(
        "createdAtTo",
        options.createdAtTo
          .toISOString(),
      );
    }

    return this.authorizedGet<
      PropertyFinderLeadSearchResponse
    >(
      `/v1/leads?${params.toString()}`,
    );
  }
}