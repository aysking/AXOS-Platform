import { z } from "zod";

export const leadTypeSchema =
  z.enum([
    "sales",
    "leasing",
    "sales_and_leasing",
  ]);

export const leadStatusSchema =
  z.enum([
    "new",
    "active",
    "qualified",
    "offer",
    "converted",
    "lost",
    "closed",
  ]);

export const leadSourceSchema =
  z.enum([
    "website",
    "property_portal",
    "referral",
    "walk_in",
    "phone",
    "email",
    "social_media",
    "campaign",
    "other",
  ]);

export const createLeadSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(100),

    firstName: z
      .string()
      .trim()
      .min(1)
      .max(100),

    lastName: z
      .string()
      .trim()
      .min(1)
      .max(100),

    email: z
      .string()
      .trim()
      .email()
      .optional(),

    phone: z
      .string()
      .trim()
      .max(50)
      .optional(),

    leadType:
      leadTypeSchema,

    status:
      leadStatusSchema
        .optional(),

    source:
      leadSourceSchema
        .optional(),

    sourceDetails: z
      .string()
      .trim()
      .max(500)
      .optional(),

    notes: z
      .string()
      .max(5000)
      .optional(),

    metadata: z
      .record(
        z.string(),
        z.unknown(),
      )
      .optional(),
  })
  .strict();

export const leadIdParamsSchema =
  z.object({
    id: z.string().uuid(),
  });

export const listLeadsQuerySchema =
  z.object({
    status:
      leadStatusSchema
        .optional(),

    leadType:
      leadTypeSchema
        .optional(),

    source:
      leadSourceSchema
        .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25),

    offset: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),
  });

export type CreateLeadInput =
  z.infer<
    typeof createLeadSchema
  >;

export type ListLeadsQuery =
  z.infer<
    typeof listLeadsQuerySchema
  >;

  export const updateLeadSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    firstName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    lastName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    email: z
      .string()
      .trim()
      .email()
      .nullable()
      .optional(),

    phone: z
      .string()
      .trim()
      .max(50)
      .nullable()
      .optional(),

    leadType:
      leadTypeSchema
        .optional(),

    status:
      leadStatusSchema
        .optional(),

    source:
      leadSourceSchema
        .nullable()
        .optional(),

    sourceDetails: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),

    notes: z
      .string()
      .max(5000)
      .nullable()
      .optional(),

    metadata: z
      .record(
        z.string(),
        z.unknown(),
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      Object.keys(value).length > 0,
    {
      message:
        "At least one field must be provided",
    },
  );

export type UpdateLeadInput =
  z.infer<
    typeof updateLeadSchema
  >;