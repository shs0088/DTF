import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { writePreviewOnBackground } from "./sharp-io";

export interface InspectionPreview {
  id: "white" | "black" | "mid-gray";
  outputPath: string;
  purpose: string;
}

export async function writeInspectionPreviewSet(
  sourcePath: string,
  outputDir: string,
): Promise<InspectionPreview[]> {
  await mkdir(outputDir, { recursive: true });

  const definitions = [
    {
      id: "white" as const,
      background: { r: 255, g: 255, b: 255 },
      purpose: "Reveal dark halos, contaminated transparent RGB and edge dirt.",
    },
    {
      id: "black" as const,
      background: { r: 0, g: 0, b: 0 },
      purpose: "Reveal white halos, lost dark edge detail and unwanted matte fringe.",
    },
    {
      id: "mid-gray" as const,
      background: { r: 128, g: 128, b: 128 },
      purpose: "Neutral cross-check for semi-transparent edges and glow/shadow transitions.",
    },
  ];

  const results: InspectionPreview[] = [];
  for (const item of definitions) {
    const outputPath = join(outputDir, `preview-${item.id}.png`);
    await writePreviewOnBackground(sourcePath, outputPath, item.background);
    results.push({ id: item.id, outputPath, purpose: item.purpose });
  }
  return results;
}
