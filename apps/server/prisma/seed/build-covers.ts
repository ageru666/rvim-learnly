// Writes the demo covers to src/public/covers (committed): `npm run seed:covers -w @learnly/server`.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALL_COVERS, STATIC_COVERS_DIR, coverFileName, renderCover } from './covers.js';

await mkdir(STATIC_COVERS_DIR, { recursive: true });
for (const { accent, variant } of ALL_COVERS) {
  await writeFile(join(STATIC_COVERS_DIR, coverFileName(accent, variant)), await renderCover(accent, variant));
}
console.log(`${ALL_COVERS.length} covers in ${STATIC_COVERS_DIR}`);
