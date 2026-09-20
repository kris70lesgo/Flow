import { defineField, defineType } from "sanity";

const incidentRef = defineField({ name: "incident", title: "Incident", type: "reference", to: [{ type: "evidenceIncident" }], validation: (rule) => rule.required() });
const supplierRef = defineField({ name: "supplier", title: "Supplier", type: "reference", to: [{ type: "evidenceSupplier" }] });

const evidenceIncident = defineType({
  name: "evidenceIncident", title: "Evidence incident", type: "document",
  fields: [
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "supplier", title: "Disrupted supplier", type: "string" }),
    defineField({ name: "affectedProduct", type: "string" }),
    defineField({ name: "status", type: "string" }),
    defineField({ name: "workflowState", type: "string" }),
    defineField({ name: "generatedAt", type: "datetime" }),
  ],
  preview: { select: { title: "incidentId", subtitle: "affectedProduct" } },
});

const evidenceSupplier = defineType({
  name: "evidenceSupplier", title: "Evidence supplier", type: "document",
  fields: [incidentRef,
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "supplierId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "name", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "location", type: "string" }),
    defineField({ name: "leadTimeDays", type: "number" }),
    defineField({ name: "costMultiplier", type: "number" }),
    defineField({ name: "riskScore", type: "number" }),
    defineField({ name: "recommendation", type: "boolean" }),
  ],
  preview: { select: { title: "name", subtitle: "location" } },
});

const evidenceClaim = defineType({
  name: "evidenceClaim", title: "Evidence claim", type: "document",
  fields: [incidentRef, supplierRef,
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "claimId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "supplierId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "text", type: "text", validation: (rule) => rule.required() }),
    defineField({ name: "source", type: "string" }),
    defineField({ name: "observedAt", type: "datetime" }),
    defineField({ name: "confidence", type: "number", validation: (rule) => rule.min(0).max(100) }),
    defineField({ name: "status", type: "string", options: { list: ["VERIFIED", "UNVERIFIED", "CONFLICT", "STALE", "MISSING"] } }),
    defineField({ name: "conflictReason", type: "text" }),
    defineField({ name: "documentId", type: "string" }),
    defineField({ name: "field", type: "string" }),
    defineField({ name: "mode", type: "string" }),
    defineField({ name: "rule", type: "string" }),
  ],
  preview: { select: { title: "text", subtitle: "status" } },
});

const evidenceDocument = defineType({
  name: "evidenceDocument", title: "Evidence document", type: "document",
  fields: [incidentRef, supplierRef,
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "documentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "supplierId", type: "string" }),
    defineField({ name: "name", type: "string" }),
    defineField({ name: "documentType", type: "string" }),
    defineField({ name: "fieldCount", type: "number" }),
    defineField({ name: "mode", type: "string" }),
    defineField({ name: "url", type: "url" }),
  ],
  preview: { select: { title: "name", subtitle: "documentType" } },
});

const evidenceSource = defineType({
  name: "evidenceSource", title: "Evidence source", type: "document",
  fields: [incidentRef, supplierRef,
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "sourceId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "supplierId", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "url", type: "url" }),
    defineField({ name: "snippet", type: "text" }),
    defineField({ name: "query", type: "string" }),
    defineField({ name: "relevance", type: "number", validation: (rule) => rule.min(0).max(100) }),
    defineField({ name: "observedAt", type: "datetime" }),
    defineField({ name: "mode", type: "string" }),
  ],
  preview: { select: { title: "title", subtitle: "query" } },
});

const evidenceDecision = defineType({
  name: "evidenceDecision", title: "Evidence decision", type: "document",
  fields: [incidentRef,
    defineField({ name: "incidentId", type: "string", validation: (rule) => rule.required() }),
    defineField({ name: "recommendedSupplierId", type: "string" }),
    defineField({ name: "confidence", type: "number", validation: (rule) => rule.min(0).max(100) }),
    defineField({ name: "reasoning", type: "text" }),
    defineField({ name: "risks", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "unknowns", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "generatedAt", type: "datetime" }),
  ],
  preview: { select: { title: "recommendedSupplierId", subtitle: "confidence" } },
});

export const evidenceTypes = [evidenceIncident, evidenceSupplier, evidenceClaim, evidenceDocument, evidenceSource, evidenceDecision];
