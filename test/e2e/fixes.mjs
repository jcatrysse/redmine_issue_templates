// Small bugs of the original plugin, fixed on 2026-10-07 (Jan's round-2 decision): the screens
// they were on. The Delete link of an enabled global note template explains why it is disabled,
// a new template form does not call the template orphaned, list_templates.json names the tracker
// of a global template, the built-in field generator offers a date input and checks the fields
// again after a tracker change, a refused new issue keeps its text instead of getting the default
// template again, and Revert also restores a CKEditor (stubbed: GEOxyz installs none).
// Restores the plugin settings and the tracker at the end.
import fs from 'node:fs';
import path from 'node:path';
import { e2e, BASE } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const t = await e2e('fixes');
const fail = msg => t.problems.push(msg);
const pluginSettings = async values => {
  await t.go('/settings/plugin/redmine_issue_templates');
  for (const [k, v] of Object.entries(values)) await t.page.setChecked(`#settings_${k}`, v);
  await t.page.click('#content input[type=submit][name=commit]');
  await t.settle();
  await t.sudo();
  t.check('save plugin settings');
};
const startDate = async on => {
  await t.go(`/trackers/${ids.trackers.Feature}/edit`);
  await t.page.setChecked('input[name="tracker[core_fields][]"][value="start_date"]', on);
  await t.page.click('#content input[type=submit]');
  await t.settle();
  await t.sudo();
  t.check('save tracker');
};

await t.login('admin');
await t.go(`/global_note_templates/${ids.global_note_templates['E2E global note']}`);
const title = await t.page.getAttribute('#content .contextual a.icon-del', 'title');
if (!/Only disabled template can be destroyed/.test(title || '')) fail(`Delete link title is ${JSON.stringify(title)}`);
// a native tooltip is not in a screenshot: show the link's title under it
await t.page.evaluate(title => {
  const p = document.createElement('div');
  p.className = 'flash notice';
  p.textContent = `Title of the Delete link: ${title}`;
  document.querySelector('#content h2').after(p);
}, title);
await t.shot('global-note-delete-title', 'An enabled global note template: the disabled Delete link carries the explanation as its tooltip (title), shown here under the links', { full: false });

await pluginSettings({ enable_builtin_fields: true });
await startDate(false);

await t.login('manager');
await t.go(`/projects/${P}/issue_templates/new`);
if (await t.page.locator('#content', { hasText: 'Orphaned template' }).count()) fail('new template form calls the template orphaned');
await t.shot('new-template-not-orphaned', 'A new template form no longer says "Orphaned template from tracker" before a tracker is chosen');

const res = await t.page.request.get(`${BASE}/projects/${P}/issue_templates/list_templates.json?issue_tracker_id=${ids.trackers.Bug}`,
  { headers: { 'X-Redmine-API-Key': ids.api_keys.manager } });
const list = await res.text();
if (res.status() !== 200) fail(`list_templates.json: HTTP ${res.status()}`);
const global = (JSON.parse(list).global_issue_templates || []).find(g => g.title === 'E2E global template');
if (global?.tracker_name !== 'Bug') fail(`global template in list_templates.json: ${JSON.stringify(global)}`);
await t.go(`/projects/${P}`);
await t.page.evaluate(text => {
  const pre = document.createElement('pre');
  pre.style.fontSize = '11px';
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = text;
  document.querySelector('#content').replaceChildren(pre);
}, `GET /projects/${P}/issue_templates/list_templates.json?issue_tracker_id=${ids.trackers.Bug} (manager's API key): HTTP ${res.status()}\n\n` +
  JSON.stringify(JSON.parse(list), null, 2));
await t.shot('list-templates-tracker-name', 'list_templates.json names the tracker of a global template ("tracker_name": "Bug"); it used to be empty');

await t.go(`/projects/${P}/issue_templates/${ids.issue_templates['E2E bug minimal']}`);
await t.page.waitForSelector('#field_selector option[value="issue_start_date"]', { state: 'attached', timeout: 15000 })
  .catch(() => fail('built-in field selector has no Start date'));
await t.page.selectOption('#field_selector', 'issue_start_date');
if (!(await t.page.locator('#json_generator input#issue_template_json_setting_field[type=date]').count())) fail('no date input for Start date');
await t.page.fill('#json_generator input#issue_template_json_setting_field[type=date]', '2026-10-07');
await t.shot('generator-date', 'The built-in field generator offers a date input for Start date (it used to be a text box)', { full: false });
await t.page.click('#json_generator .icon-add');
await t.page.selectOption('#issue_template_tracker_id', { label: 'Feature' });
await t.page.waitForSelector('#fields_setting_display_area li:has-text("Unavailable field for this tracker")', { timeout: 10000 })
  .catch(() => fail('after choosing Feature (no Start date) the field is not marked unavailable'));
await t.shot('generator-tracker-change', 'After choosing the tracker Feature, which has no Start date here, the list marks the field unavailable at once');
await t.page.selectOption('#issue_template_tracker_id', { label: 'Bug' });
await t.page.waitForSelector('#fields_setting_display_area li:has-text("Start date: 2026-10-07")', { timeout: 10000 })
  .catch(() => fail('back on Bug the field is not available again'));

await t.go(`/projects/${P}/issues/new`);
await t.page.waitForFunction(() => document.querySelector('#issue_description')?.value.includes('Steps to reproduce'));
await Promise.all([t.page.waitForNavigation(), t.page.evaluate(() => {
  document.getElementById('issue_subject').value = '';
  document.getElementById('issue_description').value = 'Typed text, sent without a subject';
  document.getElementById('issue-form').submit();
})]);
await t.settle();
await t.page.waitForTimeout(1500);
t.check('refused issue');
if (!(await t.page.locator('#errorExplanation').count())) fail('the issue without a subject was not refused');
const kept = await t.page.inputValue('#issue_description');
if (kept !== 'Typed text, sent without a subject') fail(`description after the refusal: ${JSON.stringify(kept)}`);
await t.shot('refused-issue-keeps-text', 'A new issue without a subject is refused; the description keeps what was sent, the default template is not added to it again');

await t.go(`/projects/${P}/issues/new`);
await t.page.waitForFunction(() => document.querySelector('#issue_description')?.value.includes('Steps to reproduce'));
await t.page.selectOption('#issue_template', '');
await t.page.fill('#issue_subject', 'My subject');
await t.page.fill('#issue_description', 'My text');
await t.page.evaluate(() => {
  window.CKEDITOR = { instances: { issue_description: { data: null, setData(d) { this.data = d; } } } };
});
await t.page.selectOption('#issue_template', { label: 'E2E bug minimal' });
await t.page.waitForFunction(() => document.querySelector('#issue_description').value.includes('What happened?'));
await t.page.click('#revert_template');
await t.page.waitForFunction(() => document.querySelector('#issue_description').value === 'My text');
const cke = await t.page.evaluate(() => window.CKEDITOR.instances.issue_description.data);
if (cke !== 'My text') fail(`CKEditor after Revert: ${JSON.stringify(cke)}`);
await t.page.evaluate(cke => {
  const p = document.createElement('div');
  p.className = 'flash notice';
  p.textContent = `Stubbed CKEditor after Revert: ${JSON.stringify(cke)}`;
  document.querySelector('#content').prepend(p);
}, cke);
await t.shot('revert-ckeditor', 'Revert after applying a template: the textarea and a (stubbed) CKEditor both get "My text" back; CKEditor used to keep the template text');

// restore
await t.login('admin');
await startDate(true);
await pluginSettings({ enable_builtin_fields: false });

await t.done();
