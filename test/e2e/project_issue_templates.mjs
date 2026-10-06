// Project issue templates: the list, the sidebar links on the issue list, creating (with a
// validation error), editing, copying, disabling and deleting a template, the orphaned
// templates list; refused without the permission, for non-members, and across projects.
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const t = await e2e('project-issue-templates');
const fail = msg => t.problems.push(msg);
const flash = async (kind, re, what) => {
  const text = await t.page.locator(`#flash_${kind}, #errorExplanation`).first().innerText().catch(() => '');
  if (!re.test(text)) fail(`${what}: expected ${kind} ${re}, got ${JSON.stringify(text)}`);
};

await t.login('manager');
t.page.on('dialog', d => d.accept());

await t.go(`/projects/${P}/issue_templates`);
for (const name of ['E2E bug report', 'E2E bug minimal', 'E2E disabled template', 'E2E feature request', 'E2E global template']) {
  if (!(await t.page.locator('#content', { hasText: name }).count())) fail(`list misses ${name}`);
}
if (await t.page.locator('#content', { hasText: 'E2E private template' }).count()) fail('list shows the private project\'s template');
await t.shot('list', 'The project\'s templates per tracker, with the global templates for this project below');

await t.go(`/projects/${P}/issues`);
if (!(await t.page.locator('#sidebar h3', { hasText: 'Issue template' }).count())) fail('issue list sidebar misses the template links');
await t.shot('sidebar', 'The issue list sidebar links to the issue and note templates');

const title = `E2E created ${Date.now()}`;
await t.go(`/projects/${P}/issue_templates/new`);
await t.page.selectOption('#issue_template_tracker_id', { label: 'Bug' });
await t.page.fill('#issue_template_description', 'Created in the browser');
await t.page.click('#issue_template-form input[type=submit]');
await t.settle();
t.check('create without title');
await flash('error', /Template name cannot be blank/, 'create without a title');
await t.shot('create-invalid', 'Creating a template without a name is refused with a validation message');

await t.page.fill('#issue_template_title', title);
await t.page.fill('#issue_template_issue_title', 'Created: ');
await t.page.click('#issue_template-form input[type=submit]');
await t.settle();
t.check('create');
await flash('notice', /Successful creation/, 'create');
await t.shot('created', 'The new template is saved and shown');
const showPath = new URL(t.page.url()).pathname;

await t.page.click('#content .contextual a.icon-edit');
await t.page.fill('#issue_template_description', 'Changed in the browser');
await t.page.uncheck('#issue_template_enabled');
await t.page.click('#edit-issue_template input[type=submit]');
await t.settle();
t.check('update');
await flash('notice', /Successful update/, 'update');
if (!(await t.page.locator('#issue_template_description').inputValue()).includes('Changed in the browser')) fail('update: description not saved');
await t.shot('updated', 'Editing saves the new description; the template is now disabled');

await t.page.click('#content .contextual a.icon-copy');
await t.settle();
const copyTitle = await t.page.inputValue('#issue_template_title');
if (copyTitle !== `copy_of_${title}`) fail(`copy: title is ${copyTitle}`);
await t.shot('copy', 'Copy opens a new template form filled from the template, named copy_of_...');

await t.go(showPath);
await t.page.click('#content .contextual a.icon-del');
await t.settle();
t.check('delete');
await flash('notice', /Successful deletion/, 'delete disabled template');
if (await t.page.locator('#content', { hasText: title }).count()) fail('delete: template still listed');
await t.shot('deleted', 'A disabled template is deleted after confirmation');

const enabledPath = `/projects/${P}/issue_templates/${ids.issue_templates['E2E bug minimal']}`;
await t.go(enabledPath);
if ((await t.page.getAttribute('#content .contextual a.icon-del', 'disabled')) === null) fail('delete link of an enabled template is not disabled');
await t.page.hover('#content .contextual a.icon-del');
await t.shot('delete-enabled-disabled', 'For an enabled template the Delete link is disabled (its tooltip says only disabled templates can be deleted)', { full: false });
// the request the link would send, submitted as a form so the answer is shown
await t.page.evaluate(path => {
  const f = document.createElement('form');
  f.method = 'post'; f.action = path;
  for (const [k, v] of [['_method', 'delete'], ['authenticity_token', document.querySelector('meta[name=csrf-token]').content]]) {
    const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
  }
  document.body.appendChild(f); f.submit();
}, enabledPath);
await t.page.waitForLoadState('load');
await t.settle();
t.check('delete enabled');
await flash('error', /disabled/i, 'delete enabled template');
await t.shot('delete-enabled-refused', 'Sending the delete anyway is refused: the enabled template stays, the error says to disable it first');

await t.go(`/projects/${P}/issue_templates`);
await t.page.click('a#orphaned_template_link, a:has-text("Orphaned templates from tracker")');
await t.page.waitForTimeout(800);
t.check('orphaned');
await t.shot('orphaned', 'The orphaned templates list (templates of trackers no longer in the project): none here');

// cross-project: the private project's template through this project's URL
await t.go(`/projects/${P}/issue_templates/${ids.issue_templates['E2E private template']}`, { status: 404 });
await t.shot('cross-project-404', 'A template of another project is not reachable through this project\'s URL (404)');
await t.go(`/projects/${P}/issue_templates/new?copy_from=${ids.issue_templates['E2E private template']}`, { status: 404 });

await t.login('reporter');
await t.go(`/projects/${P}/issue_templates`, { status: 403 });
await t.shot('reporter-refused', 'Without show_issue_templates the template list is refused (403)');
await t.go(`/projects/${P}/issues`);
if (await t.page.locator('#sidebar h3', { hasText: 'Issue template' }).count()) fail('reporter sees the template links in the sidebar');
await t.shot('reporter-sidebar', 'Without the permission the issue list sidebar has no template links');

await t.login('outsider');
await t.go('/projects/e2e-private/issue_templates', { status: 403 });
await t.shot('outsider-refused', 'A non-member is refused the private project\'s templates (403)');

await t.done();
