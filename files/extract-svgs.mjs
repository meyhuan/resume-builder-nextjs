import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const html = readFileSync(join(import.meta.dirname, 'wps-template-mb.html'), 'utf-8');

// Extract all <symbol ...>...</symbol> blocks
const symbolRegex = /<symbol\s[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g;
const symbols = [];
let match;
while ((match = symbolRegex.exec(html)) !== null) {
  const fullTag = match[0];
  const id = match[1];
  // Extract viewBox
  const viewBoxMatch = fullTag.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 16 16';
  // Extract fill attribute from symbol tag
  const fillMatch = fullTag.match(/<symbol[^>]*\sfill="([^"]+)"/);
  const fill = fillMatch ? fillMatch[1] : undefined;
  // Get inner content
  const innerContent = match[2];
  symbols.push({ id, viewBox, fill, innerContent, fullTag });
}

console.log(`Found ${symbols.length} SVG symbols total.\n`);

// Classify icons
const RESUME_SECTION_PREFIXES = ['svg-common-education', 'svg-common-experience', 'svg-common-head',
  'svg-common-intern', 'svg-common-jobintention', 'svg-common-other', 'svg-common-program',
  'svg-common-qualifications', 'svg-common-school', 'svg-common-self', 'svg-common-skill',
  'svg-icon-education', 'svg-icon-experience', 'svg-icon-baseInfo', 'svg-icon-intern',
  'svg-icon-jobintention', 'svg-icon-other', 'svg-icon-program', 'svg-icon-qualifications',
  'svg-icon-school', 'svg-icon-self', 'svg-icon-skill',
  'svg-left_base', 'svg-left_education', 'svg-left_experience', 'svg-left_honor',
  'svg-left_intern', 'svg-left_jobIntention', 'svg-left_other', 'svg-left_program',
  'svg-left_school', 'svg-left_self', 'svg-left_skill'];

const UI_ICON_IDS = [
  'svg-common-add-rect', 'svg-common-drag', 'svg-common-edit', 'svg-common-refresh',
  'svg-common-right', 'svg-common-tips',
  'svg-icon-add', 'svg-icon-add-gray', 'svg-icon-add-progress', 'svg-icon-arrow-down',
  'svg-icon-beautify', 'svg-icon-check', 'svg-icon-checked', 'svg-icon-close',
  'svg-icon-customized', 'svg-icon-delete', 'svg-icon-delete-gray', 'svg-icon-deliver',
  'svg-icon-diagnose', 'svg-icon-drag', 'svg-icon-edit', 'svg-icon-idphoto',
  'svg-icon-import', 'svg-icon-jobfit', 'svg-icon-kos', 'svg-icon-loading',
  'svg-icon-minus-progress', 'svg-icon-module', 'svg-icon-ok', 'svg-icon-polish',
  'svg-icon-smartcheck', 'svg-icon-uncheck',
  'svg-add-custom', 'svg-add-tag-solid', 'svg-add-tag', 'svg-add',
  'svg-close', 'svg-delete', 'svg-delete-custom', 'svg-download',
  'svg-download-btn-icon', 'svg-download-pdf', 'svg-download-doc', 'svg-download-img',
  'svg-edit', 'svg-hook', 'svg-move', 'svg-move-down', 'svg-move-up',
  'svg-operation-add', 'svg-operation-del', 'svg-operation-drag', 'svg-operation-pen',
  'svg-refresh', 'svg-rubbish', 'svg-save', 'svg-save-btn', 'svg-save-file',
  'svg-selected', 'svg-star', 'svg-upload', 'svg-warn', 'svg-question',
  'svg-notice', 'svg-logo', 'svg-my', 'svg-my-resume',
  'svg-header-desktopadd', 'svg-header-file', 'svg-header-rename', 'svg-header-return',
  'svg-head-left', 'svg-head-middle', 'svg-head-right',
  'svg-resume-undo', 'svg-resume-redo', 'svg-new-resume-undo', 'svg-new-resume-redo',
  'svg-one-page', 'svg-page-horizontal', 'svg-page-vertical',
  'svg-photo-add', 'svg-photo-upload', 'svg-import-file',
  'svg-template-free', 'svg-template-pay',
  'svg-color-active', 'svg-color-selected', 'svg-custom-color',
  'svg-style-selected', 'svg-down-selected', 'svg-more-select', 'svg-unselect',
  'svg-drag-custom', 'svg-dustbin', 'svg-jump-out', 'svg-lamp',
  'svg-module-head', 'svg-rename-modal-note',
  'svg-new-header-desktopadd', 'svg-new-header-file', 'svg-new-header-rename',
  'svg-new-my-resume', 'svg-new-flag', 'svg-new-guide',
  'svg-button-new', 'svg-company', 'svg-industry', 'svg-job-intension',
  'svg-file-pdf', 'svg-file-txt', 'svg-file-word',
  'svg-wps-img', 'svg-wps-pdf', 'svg-wps-word',
  'svg-qrcode', 'svg-stop-icon', 'svg-loading',
  'svg-toast-info', 'svg-toast-success', 'svg-toast-warn', 'svg-msg-warn',
  'svg-error_white', 'svg-warn-gray',
  'svg-baseinfo-age', 'svg-baseinfo-birthday', 'svg-baseinfo-email',
  'svg-baseinfo-location', 'svg-baseinfo-phone', 'svg-baseinfo-wechat',
  'svg-baseinfo-height', 'svg-baseinfo-weight', 'svg-baseinfo-workyear_age',
];

const outputBase = join(import.meta.dirname, '..', 'src', 'assets', 'icons');
const dirs = {
  'resume-section': join(outputBase, 'resume-section'),
  'ui': join(outputBase, 'ui'),
  'baseinfo': join(outputBase, 'baseinfo'),
  'ai': join(outputBase, 'ai'),
  'other': join(outputBase, 'other'),
};

for (const dir of Object.values(dirs)) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function classify(id) {
  if (RESUME_SECTION_PREFIXES.includes(id)) return 'resume-section';
  if (id.startsWith('svg-baseinfo-')) return 'baseinfo';
  if (id.startsWith('svg-ai-')) return 'ai';
  if (UI_ICON_IDS.includes(id)) return 'ui';
  // Skip complex decorative/illustration icons
  if (id.includes('addfile-fail') || id.includes('cloud_server') || id.includes('cloud-full') ||
      id.includes('placeholder') || id.includes('defeat') || id.includes('not-login') ||
      id.includes('optimize-') || id.includes('polish-logo') || id.includes('pay-flag') ||
      id.includes('infinite-export') || id.includes('resume-customization') ||
      id.includes('resume-pkg') || id.includes('resume-status') ||
      id.includes('super') || id.includes('vip') || id.includes('free-use') ||
      id.includes('docer') || id.includes('jinshan') || id.includes('kdocs') ||
      id.includes('jobfit-') || id.includes('download-') || id.includes('downloading') ||
      id.includes('idphoto-') || id.includes('upload-status') ||
      id.includes('blue-big-loading') || id.includes('loading-') ||
      id.includes('no-net') || id.includes('cloud-error') || id.includes('cloud-retry') ||
      id.includes('score_') || id.includes('multi-platform') ||
      id.includes('onepage-warn') || id.includes('one-page-error') ||
      id.includes('reduce-honor') || id.includes('create-copy') ||
      id.includes('jump-feed') || id.includes('jump-resume') ||
      id.includes('ai-entry-bg') || id.includes('ai-logo') ||
      id.includes('logo_ai') || id.includes('symbol_cross') ||
      id.includes('clear') || id.includes('blue-right') ||
      id.includes('doc_import') || id.includes('custom_base_info') ||
      id.includes('ai-esc') || id.includes('ai-like') ||
      id.includes('ai-create-icon') || id.includes('ai-create') ||
      id.includes('ai-chat') || id.includes('ai-add')
  ) return null; // skip
  return 'other';
}

function toFileName(id) {
  // Remove 'svg-' prefix, convert to kebab-case
  return id.replace(/^svg-/, '').replace(/_/g, '-');
}

function buildSvg(symbol) {
  const fillAttr = symbol.fill && symbol.fill !== 'none' ? ` fill="${symbol.fill}"` : '';
  const noFill = !symbol.fill || symbol.fill === 'none' ? ' fill="none"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.viewBox}"${fillAttr}${noFill}>${symbol.innerContent}</svg>`;
}

const stats = { 'resume-section': 0, ui: 0, baseinfo: 0, ai: 0, other: 0, skipped: 0 };

for (const sym of symbols) {
  const cat = classify(sym.id);
  if (!cat) {
    stats.skipped++;
    continue;
  }
  const fileName = toFileName(sym.id) + '.svg';
  const filePath = join(dirs[cat], fileName);
  const svgContent = buildSvg(sym);
  writeFileSync(filePath, svgContent, 'utf-8');
  stats[cat]++;
}

console.log('Extraction complete!');
console.log('Stats:', JSON.stringify(stats, null, 2));

// List resume-section icons for reference
console.log('\nResume section icons:');
for (const sym of symbols) {
  if (classify(sym.id) === 'resume-section') {
    console.log(`  ${sym.id} -> ${toFileName(sym.id)}.svg (viewBox: ${sym.viewBox})`);
  }
}

console.log('\nBaseinfo icons:');
for (const sym of symbols) {
  if (classify(sym.id) === 'baseinfo') {
    console.log(`  ${sym.id} -> ${toFileName(sym.id)}.svg (viewBox: ${sym.viewBox})`);
  }
}
