import { Database, FileText, Link2, SearchCheck } from "lucide-react";
import type { EvidenceGraph } from "@/lib/sanity/evidence-graph";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EvidenceGraphPanel({ graph, source }: { graph: EvidenceGraph; source: "SANITY" | "LOCAL MIRROR" }) {
  const claimsBySupplier = new Map(graph.suppliers.map((supplier) => [supplier.id, graph.claims.filter((claim) => claim.supplierId === supplier.id)]));
  const documentsBySupplier = new Map(graph.suppliers.map((supplier) => [supplier.id, graph.documents.filter((document) => document.supplierId === supplier.id)]));
  const sourcesBySupplier = new Map(graph.suppliers.map((supplier) => [supplier.id, graph.sources.filter((item) => item.supplierId === supplier.id)]));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4 text-primary" /> Supplier evidence graph</CardTitle>
        <Badge variant={source === "SANITY" ? "success" : "muted"}>{source}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{graph.incidentId} → supplier → claim → source / document → human decision. Contradictions remain linked instead of being overwritten.</p>
        <div className="grid gap-3 md:grid-cols-3">
          {graph.suppliers.map((supplier) => {
            const claims = claimsBySupplier.get(supplier.id) ?? [];
            const docs = documentsBySupplier.get(supplier.id) ?? [];
            const sources = sourcesBySupplier.get(supplier.id) ?? [];
            return (
              <article key={supplier.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{supplier.name}</h3>{supplier.recommendation && <Badge variant="success">Recommended</Badge>}</div>
                <div className="mt-3 space-y-2 text-xs">
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> {claims.length} linked claims</p>
                  {claims.map((claim) => <div key={claim.id} className="rounded border bg-background p-2"><span className={claim.status === "CONFLICT" ? "font-medium text-destructive" : "font-medium"}>{claim.status}</span> · {claim.text}</div>)}
                  <p className="flex items-center gap-1.5 text-muted-foreground"><FileText className="h-3.5 w-3.5" /> {docs.length} documents</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground"><SearchCheck className="h-3.5 w-3.5" /> {sources.length} external sources</p>
                </div>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
