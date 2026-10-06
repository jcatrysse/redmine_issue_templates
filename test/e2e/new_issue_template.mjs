// Issue templates on the new issue form: the pulldown, the default template, applying and
// reverting a template, the filter dialog, the help message, switching tracker, saving the
// issue; refused without the permission and for templates the user may not see.
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const t = await e2e('new-issue-template');
const fail = msg => t.problems.push(msg);
const expectValue = async (sel, re, what) => {
  const v = await t.page.inputValue(sel);
  if (!re.test(v)) fail(`${what}: ${sel} is ${JSON.stringify(v)}`);
};

await t.login('manager');
await t.go(`/projects/${P}/issues/new`);
await t.page.waitForSelector('#template_area', { state: 'visible' });
const options = await t.page.locator('#issue_template option').allInnerTexts();
for (const name of ['E2E bug report', 'E2E bug minimal', 'E2E global template']) {
  if (!options.includes(name)) fail(`pulldown misses ${name}: ${options}`);
}
for (const name of ['E2E disabled template', 'E2E private template', 'E2E feature request']) {
  if (options.includes(name)) fail(`pulldown offers ${name}`);
}
await expectValue('#issue_subject', /^Bug: $/, 'default template');
await expectValue('#issue_description', /Steps to reproduce/, 'default template');
await t.shot('default-applied', 'Bug tracker: the default project template is applied on open; the pulldown lists the project and global templates, not the disabled or private ones');

await t.page.click('#link_template_dialog');
await t.page.waitForSelector('#issue_template_dialog', { state: 'visible' });
await t.page.waitForSelector('#filtered_templates_list table');
await t.page.locator('#template_search_filter').pressSequentially('minimal');
await t.page.waitForTimeout(300);
const visibleRows = await t.page.locator('#filtered_templates_list tr.template_data:visible').allInnerTexts();
if (visibleRows.length !== 1 || !visibleRows[0].includes('E2E bug minimal')) fail(`filter 'minimal' shows ${JSON.stringify(visibleRows)}`);
await t.shot('filter-dialog', 'The filter dialog lists the templates of the tracker and filters them by name');
await t.page.click('#issue_template_dialog a.close');

await t.page.selectOption('#issue_template', { label: 'E2E bug minimal' });
await t.page.waitForFunction(() => document.querySelector('#issue_description').value.includes('What happened?'));
await expectValue('#issue_subject', /Minimal bug/, 'second template');
await t.shot('second-applied', 'Choosing another template appends its subject and description to what is there');

await t.page.click('#revert_template');
await t.page.waitForTimeout(500);
await expectValue('#issue_description', /^((?!What happened\?)[\s\S])*$/, 'revert');
await t.shot('reverted', 'Revert puts back the subject and description from before the last template');

await t.page.hover('.template-help');
await t.page.waitForTimeout(300);
await t.shot('help-message', 'The project help message is shown next to the pulldown', { full: false });

await t.page.mouse.move(0, 0);
await t.page.selectOption('#issue_tracker_id', { label: 'Feature' });
await t.page.waitForFunction(() => [...document.querySelectorAll('#issue_template option')].some(o => o.textContent === 'E2E feature request'));
await t.page.selectOption('#issue_template', { label: 'E2E feature request' });
await t.page.waitForFunction(() => document.querySelector('#issue_description').value.includes('User story'));
await t.shot('feature-tracker', 'Switching the tracker to Feature offers the Feature template and applies it');

await t.page.fill('#issue_subject', `Feature: from the template ${Date.now()}`);
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create issue from template');
if (!/\/issues\/\d+$/.test(t.page.url())) fail(`create issue: still on ${t.page.url()}`);
if (!(await t.page.locator('.description .wiki', { hasText: 'As a user I want' }).count())) fail('created issue misses the template text');
await t.shot('issue-created', 'The issue is saved with the text of the template');

// failure paths
await t.login('reporter');
await t.go(`/projects/${P}/issues/new`);
if (await t.page.locator('#template_area').count()) fail('reporter sees the template pulldown');
await t.shot('reporter-no-pulldown', 'Without show_issue_templates the new issue form has no template pulldown');

// the requests the form's script makes, sent from the reporter's page with its CSRF token;
// the answers are written into the page for the screenshot
const probe = await t.page.evaluate(async ({ P, privateTemplate, bug, privateProject }) => {
  const token = document.querySelector('meta[name=csrf-token]').content;
  const post = async (url, data) => {
    const r = await fetch(url, { method: 'POST', headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return { url, status: r.status, body: (await r.text()).slice(0, 120) };
  };
  const out = [
    await post(`/issue_templates/load?project_id=${P}`, { template_id: privateTemplate }),
    await post(`/projects/${P}/issue_templates/set_pulldown`, { issue_tracker_id: bug, issue_project_id: privateProject }),
  ];
  const pre = document.createElement('pre');
  pre.id = 'e2e-probe';
  pre.textContent = out.map(o => `POST ${o.url} -> HTTP ${o.status}`).join('\n');
  document.querySelector('#content').prepend(pre);
  return out;
}, { P, privateTemplate: ids.issue_templates['E2E private template'], bug: ids.trackers.Bug, privateProject: ids.projects['e2e-private'] });
for (const r of probe) {
  if (r.status !== 403) fail(`reporter: POST ${r.url} gave HTTP ${r.status}, expected 403`);
  if (r.body.includes('Confidential') || r.body.includes('E2E private template')) fail(`reporter got private template data from ${r.url}`);
}
t.check('reporter probes', { js: ['403'], requests: ['403'] });
await t.shot('reporter-load-refused', 'Loading the private project\'s template by id, or listing that project\'s templates through issue_project_id, is refused (HTTP 403, shown at the top) as a reporter');

await t.login('outsider');
await t.go('/projects/e2e-private/issues/new', { status: 403 });
await t.shot('outsider-refused', 'A non-member gets no new issue form (and no templates) in the private project');

await t.done();
