import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * ============================================================
 * ORGANIZATION
 * ============================================================
 *
 * Organization is the AXOS tenant/isolation boundary.
 *
 * There is intentionally NO separate tenants table.
 */

export const organizationStatus = pgEnum("organization_status", [
  "active",
  "suspended",
  "archived",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    name: text("name").notNull(),

    legalName: text("legal_name"),

    slug: text("slug").notNull(),

    status: organizationStatus("status")
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex(
      "organizations_slug_unique",
    ).on(table.slug),
  }),
);

/*
 * ============================================================
 * USERS
 * ============================================================
 *
 * User represents an individual identity.
 *
 * Authentication will ultimately be handled by Amazon Cognito.
 * The database stores the AXOS user profile and identity
 * reference, not authentication credentials.
 */

export const userStatus = pgEnum("user_status", [
  "active",
  "invited",
  "suspended",
  "disabled",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    cognitoSubject: text("cognito_subject"),

    email: text("email").notNull(),

    firstName: text("first_name").notNull(),

    lastName: text("last_name").notNull(),

    phone: text("phone"),

    status: userStatus("status")
      .notNull()
      .default("invited"),

    emailVerifiedAt: timestamp("email_verified_at", {
      withTimezone: true,
    }),

    lastLoginAt: timestamp("last_login_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex(
      "users_email_unique",
    ).on(table.email),

    cognitoSubjectUnique: uniqueIndex(
      "users_cognito_subject_unique",
    ).on(table.cognitoSubject),
  }),
);

/*
 * ============================================================
 * MEMBERSHIPS
 * ============================================================
 *
 * Connects a user to an organization.
 *
 * This allows the same identity model to support future
 * multi-organization / partner scenarios without requiring
 * a separate tenant layer.
 */

export const membershipStatus = pgEnum("membership_status", [
  "active",
  "invited",
  "suspended",
  "removed",
]);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    status: membershipStatus("status")
      .notNull()
      .default("invited"),

    joinedAt: timestamp("joined_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userOrganizationUnique: uniqueIndex(
      "memberships_user_organization_unique",
    ).on(table.userId, table.organizationId),

    organizationIdx: index(
      "memberships_organization_idx",
    ).on(table.organizationId),

    userIdx: index(
      "memberships_user_idx",
    ).on(table.userId),
  }),
);

/*
 * ============================================================
 * GROUPS
 * ============================================================
 *
 * Groups are user-defined organizational structures.
 *
 * They are NOT system roles.
 */

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    active: boolean("active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationNameUnique: uniqueIndex(
      "groups_organization_name_unique",
    ).on(table.organizationId, table.name),

    organizationIdx: index(
      "groups_organization_idx",
    ).on(table.organizationId),
  }),
);

/*
 * ============================================================
 * GROUP MEMBERS
 * ============================================================
 */

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, {
        onDelete: "cascade",
      }),

    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, {
        onDelete: "cascade",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.groupId,
        table.membershipId,
      ],
    }),

    membershipIdx: index(
      "group_members_membership_idx",
    ).on(table.membershipId),
  }),
);

/*
 * ============================================================
 * PERMISSIONS
 * ============================================================
 *
 * Atomic capabilities.
 *
 * Examples:
 *
 * lead.view
 * lead.create
 * offer.approve
 * invoice.create
 *
 * Permissions do NOT automatically imply other permissions.
 */

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    key: text("key").notNull(),

    resource: text("resource").notNull(),

    action: text("action").notNull(),

    description: text("description"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    keyUnique: uniqueIndex(
      "permissions_key_unique",
    ).on(table.key),

    resourceActionIdx: index(
      "permissions_resource_action_idx",
    ).on(table.resource, table.action),
  }),
);

/*
 * ============================================================
 * PERMISSION SCOPES
 * ============================================================
 */

export const permissionScope = pgEnum(
  "permission_scope",
  [
    "own",
    "group",
    "organization",
    "all",
  ],
);

/*
 * ============================================================
 * DIRECT USER PERMISSIONS
 * ============================================================
 *
 * Direct permissions are for capabilities that do not require
 * workflow authorization.
 */

export const userPermissions = pgTable(
  "user_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    membershipId: uuid("membership_id")
      .notNull()
      .references(() => memberships.id, {
        onDelete: "cascade",
      }),

    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, {
        onDelete: "cascade",
      }),

    scope: permissionScope("scope")
      .notNull(),

    groupId: uuid("group_id").references(
      () => groups.id,
      {
        onDelete: "cascade",
      },
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    membershipPermissionIdx: index(
      "user_permissions_membership_permission_idx",
    ).on(
      table.membershipId,
      table.permissionId,
    ),

    groupIdx: index(
      "user_permissions_group_idx",
    ).on(table.groupId),
  }),
);

/*
 * ============================================================
 * WORKFLOW
 * ============================================================
 */

export const workflowStatus = pgEnum(
  "workflow_status",
  [
    "draft",
    "active",
    "inactive",
    "archived",
  ],
);

export const workflows = pgTable(
  "workflows",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    entityType: text("entity_type").notNull(),

    status: workflowStatus("status")
      .notNull()
      .default("draft"),

    version: integer("version")
      .notNull()
      .default(1),

    createdByMembershipId: uuid(
      "created_by_membership_id",
    )
      .notNull()
      .references(() => memberships.id, {
        onDelete: "restrict",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdx: index(
      "workflows_organization_idx",
    ).on(table.organizationId),

    entityTypeIdx: index(
      "workflows_entity_type_idx",
    ).on(table.entityType),
  }),
);

/*
 * ============================================================
 * WORKFLOW STEPS
 * ============================================================
 */

export const workflowStepType = pgEnum(
  "workflow_step_type",
  [
    "action",
    "approval",
    "condition",
    "notification",
  ],
);

export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    stepType: workflowStepType(
      "step_type",
    )
      .notNull()
      .default("action"),

    sequence: integer("sequence")
      .notNull(),

    configuration: jsonb(
      "configuration",
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workflowSequenceUnique: uniqueIndex(
      "workflow_steps_workflow_sequence_unique",
    ).on(
      table.workflowId,
      table.sequence,
    ),

    workflowIdx: index(
      "workflow_steps_workflow_idx",
    ).on(table.workflowId),
  }),
);

/*
 * ============================================================
 * WORKFLOW STEP PERMISSIONS
 * ============================================================
 */

export const workflowStepPermissions =
  pgTable(
    "workflow_step_permissions",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      workflowStepId: uuid(
        "workflow_step_id",
      )
        .notNull()
        .references(
          () => workflowSteps.id,
          {
            onDelete: "cascade",
          },
        ),

      permissionId: uuid(
        "permission_id",
      )
        .notNull()
        .references(
          () => permissions.id,
          {
            onDelete: "cascade",
          },
        ),

      scope: permissionScope(
        "scope",
      ).notNull(),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },
    (table) => ({
      stepPermissionIdx: index(
        "workflow_step_permissions_step_permission_idx",
      ).on(
        table.workflowStepId,
        table.permissionId,
      ),
    }),
  );

/*
 * ============================================================
 * WORKFLOW ASSIGNMENTS
 * ============================================================
 */

export const workflowAssignmentType =
  pgEnum(
    "workflow_assignment_type",
    [
      "user",
      "group",
    ],
  );

export const workflowAssignments =
  pgTable(
    "workflow_assignments",
    {
      id: uuid("id")
        .defaultRandom()
        .primaryKey(),

      workflowStepId: uuid(
        "workflow_step_id",
      )
        .notNull()
        .references(
          () => workflowSteps.id,
          {
            onDelete: "cascade",
          },
        ),

      assignmentType:
        workflowAssignmentType(
          "assignment_type",
        ).notNull(),

      membershipId: uuid(
        "membership_id",
      ).references(
        () => memberships.id,
        {
          onDelete: "cascade",
        },
      ),

      groupId: uuid(
        "group_id",
      ).references(
        () => groups.id,
        {
          onDelete: "cascade",
        },
      ),

      configuration: jsonb(
        "configuration",
      ),

      createdAt: timestamp(
        "created_at",
        {
          withTimezone: true,
        },
      )
        .defaultNow()
        .notNull(),
    },
    (table) => ({
      workflowStepIdx: index(
        "workflow_assignments_workflow_step_idx",
      ).on(table.workflowStepId),

      membershipIdx: index(
        "workflow_assignments_membership_idx",
      ).on(table.membershipId),

      groupIdx: index(
        "workflow_assignments_group_idx",
      ).on(table.groupId),
    }),
  );

/*
 * ============================================================
 * AUDIT LOG
 * ============================================================
 */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    organizationId: uuid(
      "organization_id",
    )
      .notNull()
      .references(
        () => organizations.id,
        {
          onDelete: "restrict",
        },
      ),

    membershipId: uuid(
      "membership_id",
    ).references(
      () => memberships.id,
      {
        onDelete: "set null",
      },
    ),

    action: text("action")
      .notNull(),

    entityType: text(
      "entity_type",
    ),

    entityId: uuid(
      "entity_id",
    ),

    metadata: jsonb(
      "metadata",
    ),

    ipAddress: text(
      "ip_address",
    ),

    userAgent: text(
      "user_agent",
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    organizationIdx: index(
      "audit_logs_organization_idx",
    ).on(table.organizationId),

    entityIdx: index(
      "audit_logs_entity_idx",
    ).on(
      table.entityType,
      table.entityId,
    ),
  }),
);

/*
 * ============================================================
 * OUTBOX EVENTS
 * ============================================================
 *
 * Used later for reliable asynchronous processing,
 * notifications, automation and integrations.
 */

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    organizationId: uuid(
      "organization_id",
    )
      .notNull()
      .references(
        () => organizations.id,
        {
          onDelete: "restrict",
        },
      ),

    eventType: text(
      "event_type",
    ).notNull(),

    aggregateType: text(
      "aggregate_type",
    ).notNull(),

    aggregateId: uuid(
      "aggregate_id",
    ).notNull(),

    payload: jsonb(
      "payload",
    ).notNull(),

    processedAt: timestamp(
      "processed_at",
      {
        withTimezone: true,
      },
    ),

    createdAt: timestamp(
      "created_at",
      {
        withTimezone: true,
      },
    )
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    processingIdx: index(
      "outbox_events_processing_idx",
    ).on(table.processedAt),

    aggregateIdx: index(
      "outbox_events_aggregate_idx",
    ).on(
      table.aggregateType,
      table.aggregateId,
    ),
  }),
);