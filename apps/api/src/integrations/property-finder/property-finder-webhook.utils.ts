import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

/*
 * Property Finder allows a webhook subscription
 * secret up to 32 characters.
 *
 * Derive one deterministic secret per AXOS Organization.
 */
export function derivePropertyFinderWebhookSecret(
  seed: string,
  organizationId: string,
) {
  return createHmac(
    "sha256",
    seed,
  )
    .update(
      `property_finder:${organizationId}`,
    )
    .digest("hex")
    .slice(0, 32);
}

export function verifyPropertyFinderWebhookSignature(
  rawBody: string,
  signatureHeader:
    string
    | string[]
    | undefined,
  secret: string,
) {
  const signature =
    Array.isArray(
      signatureHeader,
    )
      ? signatureHeader[0]
      : signatureHeader;

  if (
    !signature ||
    !/^[a-fA-F0-9]{64}$/.test(
      signature,
    )
  ) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret,
    )
      .update(
        rawBody,
        "utf8",
      )
      .digest();

  const received =
    Buffer.from(
      signature,
      "hex",
    );

  if (
    received.length !==
    expected.length
  ) {
    return false;
  }

  return timingSafeEqual(
    received,
    expected,
  );
}