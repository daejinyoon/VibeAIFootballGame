const fs = require('node:fs');
const path = require('node:path');
const PptxGenJS = require('pptxgenjs');

const ROOT = __dirname;
const CONTENT_PATH = path.join(ROOT, 'slide-content.json');
const OUTPUT_PATH = path.join(ROOT, '2026-10-27-football-dev-presentation.pptx');
const W = 13.333;
const H = 7.5;
const C = {
  navy: '142B36',
  deep: '0C202B',
  paper: 'F7F7F2',
  white: 'FFFFFF',
  coral: 'DD6B52',
  teal: '2E9B8B',
  muted: '526871',
  pale: 'E8EEEA',
  line: 'D6E0DD',
  lightTeal: 'E4F3EE',
  lightCoral: 'FCECE7',
  gold: 'D4A150',
};
const FONT = '맑은 고딕';

function readContent(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`발표 원고를 읽을 수 없습니다: ${filePath}: ${error.message}`);
  }
}

function validateContent(content) {
  const kinds = ['title', 'timeline', 'comparison', 'mapping', 'workflow', 'incident', 'operations', 'closing'];
  if (content.schemaVersion !== 1 || content.durationSec !== 600 || !Array.isArray(content.slides) || content.slides.length !== 8) {
    throw new Error('원고는 schemaVersion=1, 8장, 총 600초여야 합니다.');
  }
  if (content.slides.reduce((sum, slide) => sum + slide.durationSec, 0) !== 600 ||
      content.slides.slice(0, 4).reduce((sum, slide) => sum + slide.durationSec, 0) !== 300) {
    throw new Error('발표 시간은 600초, S01–S04는 300초여야 합니다.');
  }
  content.slides.forEach((slide, index) => {
    const expectedId = `S${String(index + 1).padStart(2, '0')}`;
    if (slide.id !== expectedId || slide.kind !== kinds[index]) throw new Error(`${expectedId}: 슬라이드 ID 또는 종류가 잘못됐습니다.`);
    for (const key of ['title', 'subtitle', 'message', 'notes']) {
      if (typeof slide[key] !== 'string' || !slide[key].trim()) throw new Error(`${slide.id}: ${key}가 비어 있습니다.`);
    }
    if (!Array.isArray(slide.blocks) || slide.blocks.length < 2 || slide.blocks.length > 4 ||
        slide.blocks.some(block => !block.label || !block.body)) throw new Error(`${slide.id}: blocks 형식이 잘못됐습니다.`);
    if (!Array.isArray(slide.quotes) || !Array.isArray(slide.sourceRefs) || !slide.sourceRefs.length || slide.sourceRefs.length > 3 ||
        slide.sourceRefs.some(key => !content.sourceCatalog[key]) ||
        slide.quotes.some(quote => !quote.text || !content.sourceCatalog[quote.sourceKey])) {
      throw new Error(`${slide.id}: 인용 또는 출처 키가 잘못됐습니다.`);
    }
  });
  if (content.slides[2].quotes.length < 2 || !content.slides[5].blocks.some(block => block.body.includes('장시간 검증은 미실시')) ||
      !content.slides[5].notes.includes('장시간 검증') || !content.slides[6].notes.includes('원복을 완료')) {
    throw new Error('실제 인용 또는 검증·원복 한계 문구가 누락됐습니다.');
  }
}

function addText(slide, text, x, y, w, h, opts = {}) {
  if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > W + 0.02 || y + h > H + 0.02) {
    throw new Error(`텍스트 좌표가 슬라이드 밖입니다: ${String(text).slice(0, 24)}`);
  }
  slide.addText(text, {
    x, y, w, h,
    fontFace: FONT,
    fontSize: 18,
    color: C.navy,
    margin: 0,
    breakLine: false,
    valign: 'mid',
    ...opts,
  });
}

function shape(slide, type, x, y, w, h, fill, line = fill, radius = 0) {
  slide.addShape(type, {
    x, y, w, h,
    rectRadius: radius,
    fill: { color: fill },
    line: { color: line, width: line === fill ? 0 : 1 },
  });
}

function line(slide, x1, y1, x2, y2, color = C.line, width = 1.2, dash) {
  slide.addShape('line', {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color, width, ...(dash ? { dashType: dash } : {}) },
  });
}

function pill(slide, label, x, y, w, fill = C.lightTeal, color = C.teal) {
  shape(slide, 'roundRect', x, y, w, 0.35, fill);
  addText(slide, label, x + 0.1, y + 0.02, w - 0.2, 0.31, { fontSize: 11, bold: true, color, align: 'center' });
}

function sourceLabel(spec, content) {
  return spec.sourceRefs.map(key => {
    const src = content.sourceCatalog[key];
    return path.basename(src.path);
  }).join('   ·   ');
}

function baseSlide(pptx, spec, index, content) {
  const slide = pptx.addSlide();
  slide.background = { color: C.paper };
  shape(slide, 'rect', 0, 0, 0.12, H, C.coral);
  addText(slide, 'DEX / DEVELOPMENT CASE STUDY', 0.73, 0.27, 6.7, 0.26,
    { fontFace: 'Aptos', fontSize: 10, bold: true, charSpacing: 1.8, color: C.teal });
  addText(slide, '2026.10.28  ·  INTERNAL  ·  10 MIN', 8.43, 0.27, 4.15, 0.26,
    { fontFace: 'Aptos', fontSize: 10, bold: true, color: C.muted, align: 'right' });
  addText(slide, spec.title, 0.73, 0.78, 11.88, 0.66,
    { fontSize: spec.title.length > 26 ? 28 : 32, bold: true, color: C.navy });
  addText(slide, spec.subtitle, 0.75, 1.51, 11.75, 0.39,
    { fontSize: 15, color: C.muted });
  line(slide, 0.73, 6.96, 12.6, 6.96, C.line, 1);
  addText(slide, sourceLabel(spec, content), 0.74, 7.06, 10.87, 0.21,
    { fontFace: 'Aptos', fontSize: 10, color: C.muted });
  addText(slide, `${String(index + 1).padStart(2, '0')} / 08`, 11.73, 7.04, 0.83, 0.24,
    { fontFace: 'Aptos', fontSize: 10, bold: true, color: C.teal, align: 'right' });
  return slide;
}

function messageBand(slide, text, y, fill = C.lightTeal, color = C.navy) {
  shape(slide, 'roundRect', 0.74, y, 11.85, 0.62, fill);
  shape(slide, 'rect', 0.74, y, 0.07, 0.62, fill === C.lightCoral ? C.coral : C.teal);
  addText(slide, text, 1.02, y + 0.06, 11.28, 0.5,
    { fontSize: 17, bold: true, color });
}

function drawTitle(slide, spec) {
  slide.background = { color: C.deep };
  shape(slide, 'rect', 0, 0, 0.13, H, C.coral);
  shape(slide, 'rect', 0.78, 0.6, 0.43, 0.06, C.coral);
  addText(slide, 'DEX FOOTBALL ARCADE  /  DEVELOPMENT STORY', 0.79, 0.83, 9.7, 0.35,
    { fontFace: 'Aptos', fontSize: 13, bold: true, charSpacing: 1.2, color: 'B7CFC9' });
  addText(slide, '원하는 결과물은', 0.77, 1.63, 9.7, 0.78,
    { fontSize: 43, bold: true, color: C.white });
  addText(slide, '구체적인 기획에서', 0.77, 2.48, 10.7, 0.95,
    { fontSize: 48, bold: true, color: C.coral });
  addText(slide, '시작됐다', 0.77, 3.49, 7.5, 0.91,
    { fontSize: 48, bold: true, color: C.white });
  addText(slide, spec.subtitle, 0.81, 4.67, 9.8, 0.48,
    { fontSize: 20, color: 'C6D9D4' });
  line(slide, 0.81, 5.48, 12.44, 5.48, '37505A', 1.4);
  addText(slide, spec.blocks[1].body, 0.82, 5.67, 11.1, 0.65,
    { fontSize: 18, color: 'E5EEEB' });
  addText(slide, '2026.10.21–27   ·   내부 개발자 발표   ·   10분', 0.82, 6.78, 10.9, 0.28,
    { fontSize: 12, color: 'A9C1BC' });
  addText(slide, '01 / 08', 11.75, 6.78, 0.8, 0.28,
    { fontFace: 'Aptos', fontSize: 11, bold: true, color: C.coral, align: 'right' });
  addText(slide, '2D  →  3D', 9.64, 3.89, 2.75, 0.55,
    { fontFace: 'Aptos', fontSize: 24, bold: true, color: C.teal, align: 'right' });
}

function drawTimeline(slide, spec, content) {
  line(slide, 1.12, 2.28, 12.04, 2.28, C.line, 4);
  [1.55, 11.6].forEach((x, i) => {
    shape(slide, 'ellipse', x, 2.15, 0.27, 0.27, i ? C.teal : C.coral);
  });
  const old = { x: 0.74, y: 2.62, w: 5.62, h: 2.93 };
  const next = { x: 6.98, y: 2.62, w: 5.62, h: 2.93 };
  shape(slide, 'roundRect', old.x, old.y, old.w, old.h, C.white, C.line);
  shape(slide, 'roundRect', next.x, next.y, next.w, next.h, C.lightTeal);
  pill(slide, '2026.10.21 / 초기 결정', old.x + 0.32, old.y + 0.3, 2.23, C.lightCoral, C.coral);
  pill(slide, '2026.10.22 / 목표 구체화', next.x + 0.32, next.y + 0.3, 2.51);
  addText(slide, '2D 탑다운', old.x + 0.34, old.y + 0.86, 4.8, 0.45,
    { fontSize: 25, bold: true });
  spec.blocks.forEach((block, i) => {
    addText(slide, `${block.label}  ${block.body}`, old.x + 0.35, old.y + 1.42 + i * 0.43, 4.9, 0.35,
      { fontSize: 16, color: C.muted });
  });
  addText(slide, '실제 3D 장면', next.x + 0.34, next.y + 0.86, 4.8, 0.45,
    { fontSize: 25, bold: true });
  addText(slide, content.slides[2].blocks[1].body, next.x + 0.35, next.y + 1.44, 4.85, 0.75,
    { fontSize: 17, color: C.muted, valign: 'top' });
  addText(slide, content.slides[2].blocks[2].body, next.x + 0.35, next.y + 2.31, 4.85, 0.35,
    { fontFace: 'Aptos', fontSize: 16, bold: true, color: C.teal });
  messageBand(slide, spec.message, 5.9);
}

function drawComparison(slide, spec, content) {
  const cards = [
    { x: 0.74, fill: C.white, border: C.line, tagFill: C.lightCoral, tagColor: C.coral, label: '2026.10.21 / 초기', quote: spec.quotes[0], detail: spec.blocks[0].body },
    { x: 6.82, fill: C.lightTeal, border: C.lightTeal, tagFill: C.teal, tagColor: C.white, label: '2026.10.22 / 변경', quote: spec.quotes[1], detail: spec.blocks[1].body },
  ];
  cards.forEach(card => {
    shape(slide, 'roundRect', card.x, 2.12, 5.76, 3.74, card.fill, card.border);
    pill(slide, card.label, card.x + 0.32, 2.43, 2.35, card.tagFill, card.tagColor);
    addText(slide, '“', card.x + 0.31, 2.93, 0.5, 0.6,
      { fontSize: 48, bold: true, color: card.tagColor === C.white ? C.teal : C.coral });
    addText(slide, card.quote.text, card.x + 0.48, 3.32, 4.99, 1.25,
      { fontSize: 20, bold: true, valign: 'top', color: C.navy });
    line(slide, card.x + 0.35, 4.82, card.x + 5.38, 4.82, C.line, 1);
    addText(slide, card.detail, card.x + 0.36, 5.01, 5.02, 0.59,
      { fontSize: 16, color: C.muted, valign: 'top' });
  });
  messageBand(slide, spec.message, 6.08);
}

function drawMapping(slide, spec) {
  const xs = [0.75, 2.71, 8.44];
  const widths = [1.75, 5.48, 4.16];
  ['원하는 표현', '기획에서 확정한 동작', '구현 파일'].forEach((label, i) => {
    addText(slide, label, xs[i], 2.06, widths[i], 0.36,
      { fontSize: 14, bold: true, color: C.teal });
  });
  spec.blocks.slice(0, 3).forEach((block, i) => {
    const y = 2.57 + i * 0.94;
    shape(slide, 'roundRect', 0.74, y, 11.84, 0.79, i === 1 ? C.lightTeal : C.white, i === 1 ? C.lightTeal : C.line);
    const [decision, target] = block.body.split('→').map(value => value.trim());
    addText(slide, block.label, xs[0] + 0.14, y + 0.17, widths[0] - 0.22, 0.43,
      { fontSize: 20, bold: true });
    addText(slide, decision, xs[1], y + 0.13, widths[1] - 0.2, 0.52,
      { fontSize: 18, color: C.muted });
    addText(slide, target, xs[2], y + 0.18, widths[2] - 0.24, 0.42,
      { fontFace: 'Consolas', fontSize: 15, bold: true, color: C.teal });
  });
  shape(slide, 'roundRect', 0.74, 5.46, 11.84, 0.52, C.navy);
  addText(slide, '범위 결정', 0.94, 5.54, 1.3, 0.36,
    { fontSize: 16, bold: true, color: C.white });
  addText(slide, spec.blocks[3].body, 2.6, 5.54, 9.56, 0.36,
    { fontSize: 17, bold: true, color: C.white });
  messageBand(slide, spec.message, 6.13);
}

function drawWorkflow(slide, spec) {
  const lefts = [0.74, 4.84, 8.94];
  spec.blocks.forEach((block, i) => {
    const x = lefts[i];
    shape(slide, 'roundRect', x, 2.25, 3.65, 3.42, i === 1 ? C.navy : C.white, i === 1 ? C.navy : C.line);
    const light = i === 1;
    pill(slide, `0${i + 1}`, x + 0.3, 2.55, 0.65, light ? C.teal : C.lightTeal, light ? C.white : C.teal);
    addText(slide, block.label.replace(/^\d+\s*\/\s*/, ''), x + 0.31, 3.15, 3.08, 0.5,
      { fontFace: 'Aptos', fontSize: 25, bold: true, color: light ? C.white : C.navy });
    const [purpose, artifact] = block.body.split('→').map(value => value.trim());
    addText(slide, purpose, x + 0.32, 3.91, 3.0, 0.68,
      { fontSize: 16, color: light ? 'D5E5E0' : C.muted, valign: 'top' });
    line(slide, x + 0.32, 4.77, x + 3.31, 4.77, light ? '607E82' : C.line, 1);
    addText(slide, artifact, x + 0.32, 4.99, 3.04, 0.42,
      { fontFace: 'Consolas', fontSize: 13, bold: true, color: light ? '9EE5D6' : C.teal });
  });
  messageBand(slide, spec.message, 6.12);
}

function drawIncident(slide, spec) {
  const blocks = spec.blocks;
  const lefts = [0.74, 4.84, 8.94];
  blocks.slice(0, 3).forEach((block, i) => {
    const x = lefts[i];
    shape(slide, 'roundRect', x, 2.16, 3.65, 1.86, i === 1 ? C.navy : C.white, i === 1 ? C.navy : C.line);
    addText(slide, `0${i + 1}  ${block.label}`, x + 0.28, 2.43, 3.04, 0.35,
      { fontSize: 15, bold: true, color: i === 1 ? 'A9E2D5' : C.teal });
    addText(slide, i === 2 ? '실제 상태값으로 계산' : block.body, x + 0.28, 2.97, 3.04, 0.76,
      { fontSize: i === 1 ? 18 : 19, bold: true, color: i === 1 ? C.white : C.navy, valign: 'top' });
  });
  shape(slide, 'roundRect', 0.74, 4.31, 11.84, 0.86, C.deep);
  addText(slide, blocks[2].body, 1.12, 4.56, 11.08, 0.37,
    { fontFace: 'Consolas', fontSize: 20, bold: true, color: '91E0CF' });
  addText(slide, '확인된 검증', 0.79, 5.43, 2.1, 0.38,
    { fontSize: 16, bold: true, color: C.teal });
  addText(slide, '자동 테스트 168개 통과   ·   프로덕션 빌드 성공', 2.62, 5.4, 9.38, 0.42,
    { fontSize: 18, bold: true });
  messageBand(slide, '수정 후 인증 Chrome·Edge 장시간 경기 검증은 미실시', 6.09, C.lightCoral, C.navy);
}

function drawOperations(slide, spec) {
  const cards = [
    { x: 0.74, label: '문제가 된 경로', body: spec.blocks[0].body, fill: C.lightCoral, accent: C.coral },
    { x: 6.82, label: '바로잡은 경로', body: spec.blocks[1].body, fill: C.lightTeal, accent: C.teal },
  ];
  cards.forEach(card => {
    shape(slide, 'roundRect', card.x, 2.24, 5.76, 2.86, card.fill);
    shape(slide, 'rect', card.x, 2.24, 0.08, 2.86, card.accent);
    addText(slide, card.label, card.x + 0.32, 2.58, 5.01, 0.38,
      { fontSize: 16, bold: true, color: card.accent });
    addText(slide, card.body, card.x + 0.32, 3.18, 5.06, 1.17,
      { fontSize: 22, bold: true, valign: 'top' });
  });
  addText(slide, '→', 6.33, 3.25, 0.37, 0.45,
    { fontSize: 30, bold: true, color: C.navy, align: 'center' });
  shape(slide, 'roundRect', 0.74, 5.4, 11.84, 0.67, C.navy);
  addText(slide, spec.blocks[2].body, 1.02, 5.55, 11.22, 0.36,
    { fontSize: 18, bold: true, color: C.white });
  messageBand(slide, '기존 앱의 원본이 없어 원복은 완료되지 않았습니다.', 6.2, C.lightCoral);
}

function drawClosing(slide, spec) {
  spec.blocks.forEach((block, i) => {
    const x = i % 2 === 0 ? 0.74 : 6.82;
    const y = i < 2 ? 2.2 : 4.11;
    shape(slide, 'roundRect', x, y, 5.76, 1.65, i === 3 ? C.navy : C.white, i === 3 ? C.navy : C.line);
    shape(slide, 'ellipse', x + 0.28, y + 0.36, 0.65, 0.65, i === 3 ? C.teal : C.lightTeal);
    addText(slide, block.label, x + 0.38, y + 0.48, 0.45, 0.38,
      { fontFace: 'Aptos', fontSize: 16, bold: true, color: i === 3 ? C.white : C.teal, align: 'center' });
    addText(slide, block.body, x + 1.14, y + 0.34, 4.25, 0.84,
      { fontSize: 19, bold: true, color: i === 3 ? C.white : C.navy });
  });
  messageBand(slide, spec.message, 6.18);
}

function drawSlide(pptx, spec, index, content) {
  const slide = spec.kind === 'title' ? pptx.addSlide() : baseSlide(pptx, spec, index, content);
  switch (spec.kind) {
    case 'title': drawTitle(slide, spec); break;
    case 'timeline': drawTimeline(slide, spec, content); break;
    case 'comparison': drawComparison(slide, spec, content); break;
    case 'mapping': drawMapping(slide, spec); break;
    case 'workflow': drawWorkflow(slide, spec); break;
    case 'incident': drawIncident(slide, spec); break;
    case 'operations': drawOperations(slide, spec); break;
    case 'closing': drawClosing(slide, spec); break;
    default: throw new Error(`${spec.id}: 알 수 없는 레이아웃 ${spec.kind}`);
  }
  slide.addNotes(spec.notes);
}

async function buildPresentation() {
  const content = readContent(CONTENT_PATH);
  validateContent(content);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = '윤대진';
  pptx.subject = '구체적인 기획과 AI 스킬로 축구 게임을 개발한 과정';
  pptx.title = content.title;
  pptx.company = 'DEX';
  pptx.lang = 'ko-KR';
  pptx.theme = {
    headFontFace: FONT,
    bodyFontFace: FONT,
    lang: 'ko-KR',
  };
  content.slides.forEach((spec, index) => drawSlide(pptx, spec, index, content));
  await pptx.writeFile({ fileName: OUTPUT_PATH, compression: true });
  const bytes = fs.statSync(OUTPUT_PATH).size;
  if (bytes <= 0) throw new Error('생성된 PPTX가 비어 있습니다.');
  console.log(`PPTX 생성: ${OUTPUT_PATH} (${bytes} bytes, ${content.slides.length} slides)`);
}

buildPresentation().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
