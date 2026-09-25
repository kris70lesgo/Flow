import { defineConfig } from "sanity";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";

export default defineConfig({
  name: "aegisflow-evidence",
  title: "Warp Evidence Graph",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID || "af8ykvwc",
  dataset: process.env.SANITY_STUDIO_DATASET || "production",
  plugins: [visionTool()],
  schema: { types: schemaTypes },
});
