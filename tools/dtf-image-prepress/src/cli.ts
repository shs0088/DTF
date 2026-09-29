#!/usr/bin/env bun
import { analyzeSource, createDeterministicCandidate } from "./engine";

function usage(): never {
  console.error(
    "Usage:\n  bun src/cli.ts analyze <file> <width-in> <height-in> <kind> [background:true|false]\n" +
    "  bun src/cli.ts export <file> <output.png> <width-in> <height-in> <kind> [background:true|false]",
  );
  process.exit(2);
}

const [, , command, source, a, b, c, d, e] = process.argv;
if (!command || !source) usage();

if (command === "analyze") {
  if (!a || !b || !c) usage();
  const result = await analyzeSource({
    sourcePath: source,
    intent: { widthIn: Number(a), heightIn: Number(b) },
    routing: {
      kind: c as any,
      backgroundPresent: d === "true",
      textDetected: c === "text-heavy" || c === "mixed",
    },
  });
  console.log(JSON.stringify(result, null, 2));
} else if (command === "export") {
  if (!a || !b || !c || !d) usage();
  const result = await createDeterministicCandidate(
    {
      sourcePath: source,
      intent: { widthIn: Number(b), heightIn: Number(c) },
      routing: {
        kind: d as any,
        backgroundPresent: e === "true",
        textDetected: d === "text-heavy" || d === "mixed",
      },
    },
    a,
  );
  console.log(JSON.stringify(result, null, 2));
} else {
  usage();
}
