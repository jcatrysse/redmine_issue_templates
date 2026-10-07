// Redmine 7 icons (decision of Jan, 2026-10-07): every icon of the plugin comes from Redmine's
// SVG sprite; legacy-icons-compat.css and the plugin's PNG icons are gone. Checked on each
// screen of the plugin as admin and manager, and the refusals for reporter and outsider.
import { e2e } from '../../.codex/e2e/lib.mjs';

const P = 'e2e-project';
const t = await e2e('icons');
const fail = msg => t.problems.push(msg);
const pngs = [];

// every element of the plugin that carries an icon class must contain an svg from the sprite
const check = async (what) => {
  const r = await t.page.evaluate(() => {
    const legacy = [...document.querySelectorAll('link[rel=stylesheet]')].some(l => l.href.includes('legacy-icons-compat'));
    const sel = '.template_link_area a.icon, #template_area a.icon, h3.template_tracker, a.template_tooltip, ' +
      'i.template-update-link, a.template-help, #admin-menu a.icon-global_issue_templates, .contextual a.icon, ' +
      '#json_generator .icon, #json_generator .icon-only, font.non_project_tracker';
    const missing = [...document.querySelectorAll(sel)]
      .filter(el => !el.querySelector('svg.icon-svg use[href*="#icon--"]') && el.offsetParent !== null)
      .map(el => el.outerHTML.slice(0, 90));
    const icons = document.querySelectorAll(sel).length;
    return { legacy, missing, icons };
  });
  if (r.legacy) fail(`${what}: legacy-icons-compat.css is loaded`);
  for (const m of r.missing) fail(`${what}: icon element without svg: ${m}`);
  return r.icons;
};

await t.login('admin');
t.page.on('request', r => { if (/plugin_assets\/redmine_issue_templates\/.*\.png/.test(r.url())) pngs.push(r.url()); });
await t.go('/admin');
await check('admin menu');
await t.shot('admin-menu', 'Administration: Global Issue Templates with an SVG icon like the core entries', { full: false });
await t.go('/global_issue_templates');
await check('global issue templates');
await t.shot('global-issue-templates', 'Global issue templates: add, note templates and settings links, tracker heading and preview icons from the sprite');
await t.go('/global_note_templates');
await check('global note templates');
await t.go('/global_issue_templates/new');
await check('global issue template form');
const arrow = () => t.page.getAttribute('#global_issue_template_project_ids a.collapsible use', 'href');
if (!/#icon--angle-right$/.test(await arrow())) fail(`project list toggle starts with ${await arrow()}`);
await t.page.click('#global_issue_template_project_ids a.collapsible');
if (!/#icon--angle-down$/.test(await arrow())) fail(`project list toggle after a click: ${await arrow()}`);
if (!(await t.page.locator('#all_projects').isVisible())) fail('project list not expanded');
await t.shot('global-issue-template-form', 'The global template form: help icons from the sprite');

await t.login('manager');
t.page.on('request', r => { if (/plugin_assets\/redmine_issue_templates\/.*\.png/.test(r.url())) pngs.push(r.url()); });
await t.go(`/projects/${P}/issue_templates`);
const n = await check('project issue templates');
if (n < 10) fail(`project issue templates: only ${n} icon elements found`);
await t.shot('project-issue-templates', 'Project template list: tracker headings, preview, sort and the template links with sprite icons');
await t.go(`/projects/${P}/issue_templates/1`);
await check('template show');
await t.shot('template-show', 'A template: edit, copy, delete (disabled) and list with sprite icons; help icons in the form');
await t.go(`/projects/${P}/note_templates`);
await check('note templates');
await t.go(`/projects/${P}/issue_templates_settings`);
await check('template settings');
await t.go(`/projects/${P}/issues/new`);
await t.page.waitForSelector('#template_area', { state: 'visible' });
await t.page.selectOption('#issue_template', { label: 'E2E bug minimal' });
await t.page.waitForSelector('#template_status-area .flash_message svg.icon-svg');
await check('new issue form');
await t.shot('issue-form', 'The issue form: related link, preview, help, erase and revert icons, and the bulb in the "template applied" message');
await t.page.click('#link_template_dialog');
await t.page.waitForSelector('#filtered_templates_list i.template-update-link svg');
await t.page.waitForTimeout(800);
await check('template dialog');
await t.page.click('#filtered_templates_list tr.template_data:has-text("E2E bug report") i.template-update-link');
await t.page.waitForFunction(() => document.querySelector('#issue_description').value.includes('Steps to reproduce'));
await t.shot('dialog-apply', 'Clicking the arrow icon in the dialog applies the template (the click lands on the svg, the handler reads the link)');
await t.go('/issues/1');
await t.page.click('#content > .contextual a.icon-edit >> nth=0');
await t.page.click('#link_template_issue_notes_dialog');
await t.page.waitForSelector('#template_issue_notes_dialog a.template-update-link svg');
await t.page.waitForTimeout(800);
await check('note popup');
await t.shot('note-popup', 'The note template popup: preview and apply icons from the sprite', { full: false });

await t.login('reporter');
await t.go(`/projects/${P}/issue_templates`, { status: 403 });
await t.go(`/projects/${P}/issues/new`);
if (await t.page.locator('#template_area').count()) fail('reporter gets the template pulldown');
await check('reporter issue form');
await t.shot('reporter', 'Without the permission no template icons or links appear, the template pages are refused (403)');

await t.login('outsider');
await t.go('/projects/e2e-private/issue_templates', { status: 403 });
await t.shot('outsider', 'A non-member is refused the private project\'s templates (403)');

if (pngs.length) fail(`plugin PNG icons requested: ${[...new Set(pngs)].join(', ')}`);
await t.done();
