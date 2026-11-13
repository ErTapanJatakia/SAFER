import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/CyberItemModal.tsx', import.meta.url), 'utf8');

test('Cyber Hygiene control editor uses the shared modal focus hook', () => {
  assert.match(source, /import \{ useModalFocus \} from '\.\.\/hooks\/useModalFocus\.ts'/);
  assert.match(source, /useModalFocus<HTMLDivElement>\(isOpen, onClose\)/);
});

test('Cyber Hygiene control editor exposes a labelled modal dialog', () => {
  assert.match(source, /ref=\{modalRef\}[\s\S]*?tabIndex=\{-1\}[\s\S]*?role="dialog"[\s\S]*?aria-modal="true"/);
  assert.match(source, /aria-labelledby="cyber-item-modal-title"/);
  assert.match(source, /id="cyber-item-modal-title"/);
});

test('existing save and cancel actions remain connected', () => {
  assert.match(source, /onSave\(item\);\s*onClose\(\);/);
  assert.match(source, /type="button"\s+onClick=\{onClose\}/);
  assert.match(source, /<button\s+type="submit"/);
});
