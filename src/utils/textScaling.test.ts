import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(process.cwd(), 'src');
const stylesheet = readFileSync(join(sourceRoot, 'index.css'), 'utf8');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe('accessibility text scaling', () => {
  it('uses browser-relative percentages for every supported scale', () => {
    for (const [size, scale] of [
      ['100', '1'],
      ['125', '1.25'],
      ['150', '1.5'],
      ['175', '1.75'],
      ['200', '2'],
    ]) {
      expect(stylesheet).toContain(`html[data-text-size="${size}"]`);
      expect(stylesheet).toContain(`font-size: ${Number(size)}%;`);
      expect(stylesheet).toContain(`--app-text-scale: ${scale};`);
    }
  });

  it('provides a matching scale rule for every fixed-pixel Tailwind text utility in source', () => {
    const usedSizes = new Set<string>();
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        usedSizes.add(match[1]);
      }
    }

    expect(usedSizes.size).toBeGreaterThan(0);
    for (const size of usedSizes) {
      expect(
        stylesheet,
        `Missing text-scale rule for text-[${size}px] (found in source)`,
      ).toContain(`[class~="text-[${size}px]"]`);
    }
  });

  it('does not hard-code the browser root to a fixed 16px baseline', () => {
    expect(stylesheet).not.toMatch(/html\[data-text-size="\d+"\]\s*\{\s*font-size:\s*\d+px/);
  });
});
