// Seeds the baseline AegisFlow evidence graph into Sanity. Run after adding
// NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and
// SANITY_API_WRITE_TOKEN to .env.local:
//
//   node scripts/seed-sanity.mjs
//
// This deliberately uses a server-only write token. It never appears in a browser
// bundle or in the generated Sanity documents.
import { readFileSync } from "node:fs";
import { createClient } from "@sanity/client";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_WRITE_TOKEN;
if (!projectId || !token) {
  console.error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN in .env.local, then re-run.");
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, useCdn: false, apiVersion: process.env.SANITY_API_VERSION || "2026-09-21" });
const ref = (id) => ({ _type: "reference", _ref: id });
const incidentId = "aegisflow-incident-INC-1042";
const suppliers = [
  ["SUP-A", "Apex Electronics", "Germany", 14, 1.35],
  ["SUP-B", "Nexus Manufacturing", "Vietnam", 3, 1.05],
  ["SUP-C", "Shenzhen Rapid Parts", "China", 5, 0.85],
];
const claims = [
  ["c1", "SUP-A", "ISO 9001 Certified", "Internal Doc", 100, "VERIFIED"],
  ["c2", "SUP-A", "14-day lead time", "Supplier Portal", 95, "VERIFIED"],
  ["c3", "SUP-B", "3-day expedited shipping available", "Website", 91, "VERIFIED"],
  ["c4", "SUP-B", "PX-17 direct compatibility", "Spec Sheet", 94, "VERIFIED"],
  ["c5", "SUP-C", "ISO 9001 Certified", "Supplier PDF", 54, "UNVERIFIED"],
  ["c6", "SUP-C", "Established 2018", "About Us Page", 30, "CONFLICT", "Business registration shows entity formed in 2021."],
];

const docs = [{
  _id: incidentId, _type: "evidenceIncident", incidentId: "INC-1042", supplier: "Pacific Components Ltd.", affectedProduct: "PX-17 Power Controller", status: "CRITICAL", workflowState: "INVESTIGATING", generatedAt: new Date().toISOString(),
}];
for (const [supplierId, name, location, leadTimeDays, costMultiplier] of suppliers) {
  docs.push({ _id: `aegisflow-supplier-INC-1042-${supplierId}`, _type: "evidenceSupplier", incidentId: "INC-1042", supplierId, incident: ref(incidentId), name, location, leadTimeDays, costMultiplier, riskScore: 0, recommendation: false });
}
for (const [claimId, supplierId, text, source, confidence, status, conflictReason] of claims) {
  docs.push({ _id: `aegisflow-claim-INC-1042-${claimId}`, _type: "evidenceClaim", incidentId: "INC-1042", claimId, supplierId, incident: ref(incidentId), supplier: ref(`aegisflow-supplier-INC-1042-${supplierId}`), text, source, confidence, status, conflictReason, observedAt: "2026-09-20T00:00:00Z" });
}

await docs.reduce((transaction, doc) => transaction.createOrReplace(doc), client.transaction()).commit();
console.log(`Seeded ${docs.length} linked graph nodes into ${projectId}/${dataset}.`);
