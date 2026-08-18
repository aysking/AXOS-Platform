import type {
  PropertyFinderLeadContact,
} from "./property-finder.types.js";

export interface NormalizedLeadContact {
  contactType: string;

  value: string;

  normalizedValue: string;

  isPrimary: boolean;
}

function normalizeContactType(
  type: string,
) {
  const trimmed =
    type.trim();

  if (
    trimmed ===
    "whatsappUsername"
  ) {
    return "whatsapp_username";
  }

  return trimmed
    .toLowerCase();
}

export function normalizeEmail(
  value: string,
) {
  return value
    .trim()
    .toLowerCase();
}

export function normalizePhone(
  value: string,
) {
  const trimmed =
    value.trim();

  let digits =
    trimmed.replace(
      /\D/g,
      "",
    );

  /*
   * Convert international 00 prefix:
   *
   * 00971501234567
   * ->
   * 971501234567
   */
  if (
    digits.startsWith(
      "00",
    )
  ) {
    digits =
      digits.slice(2);
  }

  /*
   * UAE local mobile:
   *
   * 0501234567
   * ->
   * +971501234567
   *
   * Property Finder AE is currently our
   * first portal integration.
   */
  if (
    /^05\d{8}$/.test(
      digits,
    )
  ) {
    return `+971${digits.slice(
      1,
    )}`;
  }

  /*
   * UAE international without +:
   *
   * 971501234567
   * ->
   * +971501234567
   */
  if (
    /^971\d+$/.test(
      digits,
    )
  ) {
    return `+${digits}`;
  }

  if (
    trimmed.startsWith("+")
  ) {
    return `+${digits}`;
  }

  return digits;
}

export function normalizeWhatsappUsername(
  value: string,
) {
  return value
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function normalizeContactValue(
  contactType: string,
  value: string,
) {
  if (
    contactType === "email"
  ) {
    return normalizeEmail(
      value,
    );
  }

  if (
    contactType === "phone"
  ) {
    return normalizePhone(
      value,
    );
  }

  if (
    contactType ===
    "whatsapp_username"
  ) {
    return normalizeWhatsappUsername(
      value,
    );
  }

  return value
    .trim()
    .toLowerCase();
}

export function normalizePropertyFinderContacts(
  contacts:
    PropertyFinderLeadContact[],
): NormalizedLeadContact[] {
  const normalized:
    NormalizedLeadContact[] = [];

  const seen =
    new Set<string>();

  const primaryTypes =
    new Set<string>();

  for (
    const contact of contacts
  ) {
    if (
      !contact.type ||
      !contact.value
    ) {
      continue;
    }

    const contactType =
      normalizeContactType(
        contact.type,
      );

    const value =
      contact.value.trim();

    const normalizedValue =
      normalizeContactValue(
        contactType,
        value,
      );

    if (
      !normalizedValue
    ) {
      continue;
    }

    const key =
      `${contactType}:${normalizedValue}`;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    const isPrimary =
      !primaryTypes.has(
        contactType,
      );

    primaryTypes.add(
      contactType,
    );

    normalized.push({
      contactType,
      value,
      normalizedValue,
      isPrimary,
    });
  }

  return normalized;
}