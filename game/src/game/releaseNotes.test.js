import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { APP_VERSION, APP_VERSION_LABEL, RELEASE_NOTES } from './releaseNotes.js';

test('the first release is labeled 1.0.0 and has complete Korean patch note sections', () => {
  const packageMetadata = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(APP_VERSION, '1.0.0');
  assert.equal(packageMetadata.version, APP_VERSION);
  assert.equal(APP_VERSION_LABEL, 'v1.0.0');
  assert.deepEqual(RELEASE_NOTES.map(({ title }) => title), [
    '5단계 아케이드 캠페인',
    '우리 팀 스타일 꾸미기',
    '골 세리머니와 연출',
    '회사 사용자 대전',
    '킥오프와 조작 개선',
  ]);
  assert.ok(RELEASE_NOTES.every(({ items }) => items.length > 0 && items.every((item) => item.trim().length > 0)));
});
