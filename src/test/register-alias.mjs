import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
const rawPaths = tsconfig.compilerOptions?.paths ?? {};

const aliasEntries = Object.entries(rawPaths).flatMap(([aliasPattern, targets]) => {
  const aliasPrefix = aliasPattern.replace(/\*$/, '');
  return (targets as string[]).map((targetPattern) => ({
    aliasPrefix,
    targetPrefix: targetPattern.replace(/\*$/, '')
  }));
});

export async function resolve(specifier, context, defaultResolve) {
  for (const entry of aliasEntries) {
    if (specifier.startsWith(entry.aliasPrefix)) {
      const relativePart = specifier.slice(entry.aliasPrefix.length);
      const candidateBase = path.join(projectRoot, entry.targetPrefix, relativePart);
      const candidates = [
        candidateBase,
        `${candidateBase}.ts`,
        `${candidateBase}.tsx`,
        `${candidateBase}.js`,
        `${candidateBase}.mjs`,
        path.join(candidateBase, 'index.ts'),
        path.join(candidateBase, 'index.js')
      ];

      for (const candidate of candidates) {
        try {
          return defaultResolve(pathToFileURL(candidate).href, context, defaultResolve);
        } catch {
          // try next candidate
        }
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
