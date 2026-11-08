import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

// Gzipped size budget for the bundle. Raise it deliberately if the bundle grows.
const LIMIT_KB = 200;
const BUNDLE = "dist/index.js";

const gzipKb = gzipSync(readFileSync(BUNDLE), { level: 9 }).length / 1024;
const report = `${BUNDLE} is ${gzipKb.toFixed(1)} kB gzipped (limit ${LIMIT_KB} kB)`;

if (gzipKb > LIMIT_KB) {
  console.error(report);
  process.exit(1);
}
console.log(report);
