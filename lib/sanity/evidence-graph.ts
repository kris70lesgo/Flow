import { createClient } from "@sanity/client";
import { Incident } from "@/schemas/core";
import { ActivityLedger } from "@/lib/integrations/ledger";

type EvidenceMode = "LIVE" | "LOCAL" | "DEMO SEEDED";

export interface EvidenceGraphClaim {
  id: string;
  supplierId: string;
  text: string;
  source: string;
  observedAt: string;
  confidence: number;
  status: string;
  conflictReason?: string;
  documentId?: string;
  field?: string;
  mode?: EvidenceMode;
  rule?: string;
}

export interface EvidenceGraphSupplier {
  id: string;
  name: string;
  location: string;
  leadTimeDays: number;
  costMultiplier: number;
  riskScore: number;
  recommendation: boolean;
}

export interface EvidenceGraphDocument {
  id: string;
  supplierId?: string;
  name: string;
  documentType: string;
  fieldCount: number;
  mode: EvidenceMode;
  url: string;
}

export interface EvidenceGraphSource {
  id: string;
  supplierId?: string;
  title: string;
  url: string;
  snippet: string;
  query: string;
  relevance: number;
  observedAt: string;
  mode: EvidenceMode;
}

export interface EvidenceGraph {
  incidentId: string;
  supplier: string;
  affectedProduct: string;
  status: string;
  workflowState: string;
  generatedAt: string;
  suppliers: EvidenceGraphSupplier[];
  claims: EvidenceGraphClaim[];
  documents: EvidenceGraphDocument[];
  sources: EvidenceGraphSource[];
  decision?: { recommendedSupplierId: string; confidence: number; reasoning: string; risks: string[]; unknowns: string[] };
}

const projectId = () => process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();
const dataset = () => process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();
const token = () => process.env.SANITY_API_WRITE_TOKEN?.trim();

export function isSanityReadable(): boolean {
  return Boolean(projectId() && dataset());
}

export function isSanityWritable(): boolean {
  return Boolean(isSanityReadable() && token());
}

function client(write = false) {
  const id = projectId();
  const data = dataset();
  if (!id || !data) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET not configured");
  if (write && !token()) throw new Error("SANITY_API_WRITE_TOKEN not configured");
  return createClient({
    projectId: id,
    dataset: data,
    apiVersion: process.env.SANITY_API_VERSION || "2026-09-21",
    useCdn: false,
    token: write ? token() : process.env.SANITY_API_READ_TOKEN?.trim(),
    perspective: "published",
  });
}

const idPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");
const documentId = (kind: string, id: string) => `aegisflow-${kind}-${idPart(id)}`;
const reference = (id: string) => ({ _type: "reference", _ref: id });

/** Convert the workflow's typed incident record into a portable evidence graph. */
export function buildEvidenceGraph(incident: Incident): EvidenceGraph {
  return {
    incidentId: incident.id,
    supplier: incident.supplier,
    affectedProduct: incident.affectedProduct,
    status: incident.status,
    workflowState: incident.state,
    generatedAt: new Date().toISOString(),
    suppliers: incident.alternativeSuppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      location: supplier.location,
      leadTimeDays: supplier.leadTimeDays,
      costMultiplier: supplier.costMultiplier,
      riskScore: supplier.riskScore,
      recommendation: Boolean(supplier.recommendation),
    })),
    claims: incident.alternativeSuppliers.flatMap((supplier) => supplier.claims.map((claim) => ({
      id: claim.id,
      supplierId: supplier.id,
      text: claim.text,
      source: claim.source,
      observedAt: claim.timestamp,
      confidence: claim.confidence,
      status: claim.status,
      conflictReason: claim.conflictReason,
      documentId: claim.documentEvidence?.documentId,
      field: claim.documentEvidence?.field,
      mode: claim.documentEvidence?.mode,
      rule: claim.documentEvidence?.rule,
    }))),
    documents: (incident.documentsProcessed ?? []).map((doc) => ({
      id: doc.id,
      supplierId: doc.supplierId,
      name: doc.name,
      documentType: doc.type,
      fieldCount: doc.fieldCount,
      mode: doc.mode,
      url: doc.url,
    })),
    sources: (incident.externalSources ?? []).map((source) => ({
      id: source.id,
      supplierId: source.supplierId,
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      query: source.query,
      relevance: source.relevance,
      observedAt: source.observedAt,
      mode: source.mode,
    })),
    decision: incident.decision && {
      recommendedSupplierId: incident.decision.recommendedSupplierId,
      confidence: incident.decision.confidence,
      reasoning: incident.decision.reasoning,
      risks: incident.decision.risks,
      unknowns: incident.decision.unknowns,
    },
  };
}

function toSanityDocuments(graph: EvidenceGraph): Array<Record<string, unknown>> {
  const incidentDocId = documentId("incident", graph.incidentId);
  const documents: Array<Record<string, unknown>> = [{
    _id: incidentDocId,
    _type: "evidenceIncident",
    incidentId: graph.incidentId,
    supplier: graph.supplier,
    affectedProduct: graph.affectedProduct,
    status: graph.status,
    workflowState: graph.workflowState,
    generatedAt: graph.generatedAt,
  }];

  for (const supplier of graph.suppliers) {
    documents.push({
      _id: documentId("supplier", `${graph.incidentId}-${supplier.id}`),
      _type: "evidenceSupplier",
      incidentId: graph.incidentId,
      supplierId: supplier.id,
      incident: reference(incidentDocId),
      ...supplier,
    });
  }
  for (const claim of graph.claims) {
    documents.push({
      _id: documentId("claim", `${graph.incidentId}-${claim.id}`),
      _type: "evidenceClaim",
      incidentId: graph.incidentId,
      claimId: claim.id,
      incident: reference(incidentDocId),
      supplier: reference(documentId("supplier", `${graph.incidentId}-${claim.supplierId}`)),
      ...claim,
    });
  }
  for (const doc of graph.documents) {
    documents.push({
      _id: documentId("document", `${graph.incidentId}-${doc.id}`),
      _type: "evidenceDocument",
      incidentId: graph.incidentId,
      documentId: doc.id,
      incident: reference(incidentDocId),
      supplier: doc.supplierId ? reference(documentId("supplier", `${graph.incidentId}-${doc.supplierId}`)) : undefined,
      ...doc,
    });
  }
  for (const source of graph.sources) {
    documents.push({
      _id: documentId("source", `${graph.incidentId}-${source.id}`),
      _type: "evidenceSource",
      incidentId: graph.incidentId,
      sourceId: source.id,
      incident: reference(incidentDocId),
      supplier: source.supplierId ? reference(documentId("supplier", `${graph.incidentId}-${source.supplierId}`)) : undefined,
      ...source,
    });
  }
  if (graph.decision) {
    documents.push({
      _id: documentId("decision", graph.incidentId),
      _type: "evidenceDecision",
      incidentId: graph.incidentId,
      incident: reference(incidentDocId),
      ...graph.decision,
      generatedAt: graph.generatedAt,
    });
  }
  return documents;
}

/** Upsert every node in an investigation's evidence graph as linked Sanity documents. */
export async function syncEvidenceGraph(incident: Incident, ledger: ActivityLedger): Promise<void> {
  const graph = buildEvidenceGraph(incident);
  const docs = toSanityDocuments(graph);
  const id = projectId();
  const data = dataset();
  await ledger.track({
    sponsor: "Sanity",
    operation: "upsert supplier evidence graph",
    method: "MUTATION",
    endpoint: id && data ? `https://${id}.api.sanity.io/v${process.env.SANITY_API_VERSION || "2026-09-21"}/data/mutate/${data}` : "Sanity Content Lake",
    request: { incidentId: incident.id, nodes: docs.length, types: [...new Set(docs.map((doc) => doc._type))] },
    enabled: isSanityWritable(),
    onLive: async () => {
      const transaction = client(true).transaction();
      for (const doc of docs) transaction.createOrReplace(doc as never);
      await transaction.commit();
      return { value: undefined, response: { nodes: docs.length }, note: "Linked supplier evidence graph persisted to Sanity Content Lake." };
    },
    onFallback: () => ({ value: undefined, response: { nodes: 0 }, note: "Sanity is not configured — evidence remains in the local incident mirror until credentials are added." }),
  });
}

/** Read the complete graph back from Sanity; returns null when the graph is unavailable. */
export async function readEvidenceGraph(incidentId: string): Promise<EvidenceGraph | null> {
  if (!isSanityReadable()) return null;
  type SanitySupplier = Omit<EvidenceGraphSupplier, "id"> & { supplierId: string };
  type SanityClaim = Omit<EvidenceGraphClaim, "id"> & { claimId: string };
  type SanityDocument = Omit<EvidenceGraphDocument, "id"> & { documentId: string };
  type SanitySource = Omit<EvidenceGraphSource, "id"> & { sourceId: string };
  const data = await client().fetch<{
    incident: Omit<EvidenceGraph, "suppliers" | "claims" | "documents" | "sources" | "decision"> | null;
    suppliers: SanitySupplier[];
    claims: SanityClaim[];
    documents: SanityDocument[];
    sources: SanitySource[];
    decision: EvidenceGraph["decision"] | null;
  }>(`{
    "incident": *[_type == "evidenceIncident" && incidentId == $incidentId][0]{incidentId, supplier, affectedProduct, status, workflowState, generatedAt},
    "suppliers": *[_type == "evidenceSupplier" && incidentId == $incidentId] | order(name asc){supplierId, name, location, leadTimeDays, costMultiplier, riskScore, recommendation},
    "claims": *[_type == "evidenceClaim" && incidentId == $incidentId]{claimId, supplierId, text, source, observedAt, confidence, status, conflictReason, documentId, field, mode, rule},
    "documents": *[_type == "evidenceDocument" && incidentId == $incidentId]{documentId, supplierId, name, "documentType": documentType, fieldCount, mode, url},
    "sources": *[_type == "evidenceSource" && incidentId == $incidentId]{sourceId, supplierId, title, url, snippet, query, relevance, observedAt, mode},
    "decision": *[_type == "evidenceDecision" && incidentId == $incidentId][0]{recommendedSupplierId, confidence, reasoning, risks, unknowns}
  }`, { incidentId });
  if (!data.incident) return null;
  return {
    ...data.incident,
    suppliers: data.suppliers.map(({ supplierId, ...supplier }) => ({ id: supplierId, ...supplier })),
    claims: data.claims.map(({ claimId, ...claim }) => ({ id: claimId, ...claim })),
    documents: data.documents.map(({ documentId, ...doc }) => ({ id: documentId, ...doc })),
    sources: data.sources.map(({ sourceId, ...source }) => ({ id: sourceId, ...source })),
    decision: data.decision ?? undefined,
  };
}
