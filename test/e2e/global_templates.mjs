// Global issue and note templates (Administration): list, create (with a validation error),
// assign to a project, edit, delete; the global template then shows in that project's new
// issue form. Every page and every write is refused to non-administrators.
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const t = await e2e('global-templates');
const fail = msg => t.problems.push(msg);
const flash = async (kind, re, what) => {
  const text = await t.page.locator(`#flash_${kind}, #errorExplanation`).first().innerText().catch(() => '');
  if (!re.test(text)) fail(`${what}: expected ${kind} ${re}, got ${JSON.stringify(text)}`);
};
// submits a form the way the browser would (CSRF token from the page), the result page is shown
const submit = (action, method, fields) => Promise.all([t.page.waitForNavigation(), t.page.evaluate(({ action, method, fields }) => {
  const f = document.createElement('form');
  f.method = 'post'; f.action = action;
  const all = [['_method', method], ['authenticity_token', document.querySelector('meta[name=csrf-token]').content], ...fields];
  for (const [k, v] of all) { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i); }
  document.body.appendChild(f); f.submit();
}, { action, method, fields }).catch(() => {})]);

await t.login('admin');
t.page.on('dialog', d => d.accept());
await t.go('/admin');
await t.shot('admin-menu', 'Administration lists Global Issue Templates (raster icon through legacy-icons-compat on Redmine 7)', { full: false });

await t.go('/global_issue_templates');
if (!(await t.page.locator('#content', { hasText: 'E2E global template' }).count())) fail('global list misses E2E global template');
await t.shot('issue-list', 'The global issue templates per tracker');

const title = `E2E global ${Date.now()}`;
await t.go('/global_issue_templates/new');
await t.page.fill('#global_issue_template_description', 'Global text from the browser');
await t.page.selectOption('#global_issue_template_tracker_id', { label: 'Bug' });
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('create invalid');
await flash('error', /Template name cannot be blank/, 'create without title');
await t.shot('issue-create-invalid', 'A global template without a name is refused with a validation message');
await t.page.fill('#global_issue_template_title', title);
await t.page.selectOption('#global_issue_template_tracker_id', { label: 'Bug' });
await t.page.check('#global_issue_template_enabled');
await t.page.click('#global_issue_template_project_ids a.collapsible');
await t.page.check(`#all_projects input[value="${ids.projects['e2e-project']}"]`);
await t.shot('issue-new', 'The new global template is enabled and assigned to the E2E project');
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('create');
await flash('notice', /Successful creation/, 'create');
await t.shot('issue-created', 'The global template is saved');
const showPath = new URL(t.page.url()).pathname;

await t.go('/projects/e2e-project/issues/new');
await t.page.waitForSelector('#template_area', { state: 'visible' });
if (!(await t.page.locator('#issue_template option.global', { hasText: title }).count())) fail('new issue form misses the new global template');
await t.shot('issue-in-project', 'The project\'s new issue form offers the new global template in its pulldown');

await t.go(showPath);
await t.page.fill('#global_issue_template_description', 'Global text changed');
await t.page.uncheck('#global_issue_template_enabled');
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('update');
await flash('notice', /Successful update/, 'update');
await t.shot('issue-updated', 'Editing saves the change; the template is disabled');
await t.page.click('#content .contextual a.icon-del');
await t.settle();
t.check('delete');
await flash('notice', /Successful deletion/, 'delete');
await t.shot('issue-deleted', 'The disabled global template is deleted');

await t.go('/global_note_templates');
if (!(await t.page.locator('#content', { hasText: 'E2E global note' }).count())) fail('global note list misses E2E global note');
await t.shot('note-list', 'The global note templates per tracker');
const noteName = `E2E global note ${Date.now()}`;
await t.go('/global_note_templates/new');
await t.page.fill('#global_note_template_name', noteName);
await t.page.selectOption('#global_note_template_tracker_id', { label: 'Bug' });
await t.page.fill('#global_note_template_description', 'Global note from the browser');
await t.page.selectOption('#global_note_template_visibility', 'open');
await t.page.check('#global_note_template_enabled');
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('create note');
await flash('notice', /Successful creation/, 'create global note');
await t.shot('note-created', 'A global note template is saved');
if ((await t.page.getAttribute('#content .contextual a.icon-del', 'disabled')) === null) fail('delete link of an enabled global note is not disabled');
await submit(new URL(t.page.url()).pathname, 'delete', []);
await t.page.waitForLoadState('load');
await t.settle();
t.check('delete enabled note');
await flash('error', /disabled/i, 'delete enabled global note');
await t.shot('note-delete-enabled', 'The Delete link of an enabled global note template is disabled; sending the delete anyway is refused with an error');

// failure paths: a project member with every project permission is not an administrator
await t.login('manager');
await t.go('/global_issue_templates', { status: 403 });
await t.shot('manager-refused', 'The global template pages are refused to a non-administrator (403)');
await t.go('/global_note_templates', { status: 403 });
await submit('/global_issue_templates', 'post', [['global_issue_template[title]', 'Created by manager'],
  ['global_issue_template[description]', 'x'], ['global_issue_template[tracker_id]', String(ids.trackers.Bug)]]);
await t.page.waitForLoadState('load');
t.check('manager create', { requests: ['403'] });
if (!(await t.page.locator('#errorExplanation, p#errorExplanation', { hasText: /not authorized/ }).count())) fail('manager create of a global template not refused');
await t.shot('manager-create-refused', 'Creating a global template as a non-administrator is refused (403); this used to succeed');
await submit(`/global_issue_templates/${ids.global_issue_templates['E2E global template']}`, 'delete', []);
await t.page.waitForLoadState('load');
t.check('manager delete', { requests: ['403'] });
await submit(`/global_note_templates/${ids.global_note_templates['E2E global note']}`, 'patch',
  [['global_note_template[description]', 'Changed by manager']]);
await t.page.waitForLoadState('load');
t.check('manager update note', { requests: ['403'] });
await t.shot('manager-update-refused', 'Changing a global note template as a non-administrator is refused (403); this used to succeed');

await t.login('reporter');
await t.go('/global_issue_templates/new', { status: 403 });
await t.shot('reporter-refused', 'A reporter is refused too');

await t.login('admin');
await t.go('/global_issue_templates');
if (!(await t.page.locator('#content', { hasText: 'E2E global template' }).count())) fail('E2E global template was deleted by the manager');
await t.go(`/global_note_templates/${ids.global_note_templates['E2E global note']}`);
if (await t.page.locator('#content', { hasText: 'Changed by manager' }).count()) fail('global note changed by the manager');
await t.shot('unchanged', 'Afterwards the global templates the manager tried to delete or change are unchanged');

await t.done();
