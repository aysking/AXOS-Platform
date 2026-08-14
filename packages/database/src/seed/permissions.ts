export const AXOS_PERMISSIONS = [
  // ============================================================
  // LEADS
  // ============================================================

  {
    key: "lead.view",
    resource: "lead",
    action: "view",
    description: "View leads",
  },
  {
    key: "lead.create",
    resource: "lead",
    action: "create",
    description: "Create leads",
  },
  {
    key: "lead.edit",
    resource: "lead",
    action: "edit",
    description: "Edit leads",
  },

  // ============================================================
  // PROPERTIES
  // ============================================================

  {
    key: "property.read",
    resource: "property",
    action: "read",
    description: "View property information",
  },
  {
    key: "property.create",
    resource: "property",
    action: "create",
    description: "Create properties",
  },
  {
    key: "property.edit",
    resource: "property",
    action: "edit",
    description: "Edit properties",
  },

  // ============================================================
  // OFFERS
  // ============================================================

  {
    key: "offer.view",
    resource: "offer",
    action: "view",
    description: "View offers",
  },
  {
    key: "offer.create",
    resource: "offer",
    action: "create",
    description: "Create offers",
  },
  {
    key: "offer.edit",
    resource: "offer",
    action: "edit",
    description: "Edit offers",
  },
  {
    key: "offer.approve",
    resource: "offer",
    action: "approve",
    description: "Approve offers",
  },

  // ============================================================
  // INVOICES
  // ============================================================

  {
    key: "invoice.view",
    resource: "invoice",
    action: "view",
    description: "View invoices",
  },
  {
    key: "invoice.create",
    resource: "invoice",
    action: "create",
    description: "Create invoices",
  },
  {
    key: "invoice.edit",
    resource: "invoice",
    action: "edit",
    description: "Edit invoices",
  },
  {
    key: "invoice.approve",
    resource: "invoice",
    action: "approve",
    description: "Approve invoices",
  },

  // ============================================================
  // RECEIPTS
  // ============================================================

  {
    key: "receipt.view",
    resource: "receipt",
    action: "view",
    description: "View receipts",
  },
  {
    key: "receipt.create",
    resource: "receipt",
    action: "create",
    description: "Create receipts",
  },
  {
    key: "receipt.edit",
    resource: "receipt",
    action: "edit",
    description: "Edit receipts",
  },
  {
    key: "receipt.approve",
    resource: "receipt",
    action: "approve",
    description: "Approve receipts",
  },

  // ============================================================
  // USERS
  // ============================================================

  {
    key: "user.view",
    resource: "user",
    action: "view",
    description: "View users",
  },
  {
    key: "user.create",
    resource: "user",
    action: "create",
    description: "Create users",
  },
  {
    key: "user.edit",
    resource: "user",
    action: "edit",
    description: "Edit users",
  },

  // ============================================================
  // GROUPS
  // ============================================================

  {
    key: "group.view",
    resource: "group",
    action: "view",
    description: "View groups",
  },
  {
    key: "group.create",
    resource: "group",
    action: "create",
    description: "Create groups",
  },
  {
    key: "group.edit",
    resource: "group",
    action: "edit",
    description: "Edit groups",
  },

  // ============================================================
  // WORKFLOWS
  // ============================================================

  {
    key: "workflow.view",
    resource: "workflow",
    action: "view",
    description: "View workflows",
  },
  {
    key: "workflow.create",
    resource: "workflow",
    action: "create",
    description: "Create workflows",
  },
  {
    key: "workflow.edit",
    resource: "workflow",
    action: "edit",
    description: "Edit workflows",
  },

  // ============================================================
  // ORGANIZATION
  // ============================================================

  {
    key: "organization.view",
    resource: "organization",
    action: "view",
    description: "View organization information",
  },
  {
    key: "organization.edit",
    resource: "organization",
    action: "edit",
    description: "Edit organization information",
  },
] as const;