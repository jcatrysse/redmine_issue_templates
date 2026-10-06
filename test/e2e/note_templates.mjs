// Note templates: managing them in a project (create with role visibility, edit, delete) and
// using them on an issue (the popup, visibility open/roles/mine, a global note template,
// applying one to the notes and saving); refused without the permission and across projects.
import fs from 'node:fs';
import path from 'node:path';
import { e2e } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const t = await e2e('note-templates');
const fail = msg => t.problems.push(msg);
const flash = async (kind, re, what) => {
  const text = await t.page.locator(`#flash_${kind}, #errorExplanation`).first().innerText().catch(() => '');
  if (!re.test(text)) fail(`${what}: expected ${kind} ${re}, got ${JSON.stringify(text)}`);
};
const openNotePopup = async () => {
  await t.page.click('#content > .contextual a.icon-edit >> nth=0');
  await t.page.waitForSelector('#template_issue_notes', { state: 'visible' });
  await t.page.click('#link_template_issue_notes_dialog');
  await t.page.waitForSelector('#template_issue_notes_dialog .filtered_templates_list table');
  await t.page.waitForTimeout(800); // the popup fades in
  return t.page.locator('#template_issue_notes_dialog .filtered_templates_list tr.template_data td:first-child').allInnerTexts();
};

await t.login('manager');
t.page.on('dialog', d => d.accept());

await t.go(`/projects/${P}/note_templates`);
for (const name of ['E2E open note', 'E2E roles note']) {
  if (!(await t.page.locator('#content', { hasText: name }).count())) fail(`list misses ${name}`);
}
await t.shot('list', 'The project\'s note templates per tracker, with the global note templates below');

const name = `E2E note ${Date.now()}`;
await t.go(`/projects/${P}/note_templates/new`);
await t.page.fill('#note_template_name', name);
await t.page.selectOption('#note_template_tracker_id', { label: 'Bug' });
await t.page.fill('#note_template_description', 'Note created in the browser');
await t.page.selectOption('#note_template_visibility', 'roles');
await t.page.check('#visible_roles_checkbox input[type=checkbox] >> nth=0');
await t.shot('new-roles', 'A new note template visible to selected roles');
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('create');
await flash('notice', /Successful creation/, 'create');
await t.shot('created', 'The note template is saved with its roles');

await t.page.click('#content .contextual a.icon-edit');
await t.page.fill('#note_template_description', 'Note changed in the browser');
await t.page.uncheck('#note_template_enabled');
await t.page.click('#content input[type=submit][name=commit]');
await t.settle();
t.check('update');
await flash('notice', /Successful update/, 'update');
await t.shot('updated', 'Editing saves the description; the template is disabled');

await t.page.click('#content .contextual a.icon-del');
await t.settle();
t.check('delete');
await flash('notice', /Successful deletion/, 'delete');
await t.shot('deleted', 'The disabled note template is deleted');

await t.go('/issues/1');
let names = await openNotePopup();
for (const n of ['E2E open note', 'E2E roles note', 'E2E global note']) if (!names.includes(n)) fail(`popup misses ${n}: ${names}`);
if (names.includes('E2E mine note')) fail('manager sees the admin\'s "mine" note template');
await t.shot('popup', 'On the issue: the popup offers the open, role and global note templates, not another user\'s private one', { full: false });
await t.page.click('#template_issue_notes_dialog tr.template_data:has-text("E2E open note") a.template-update-link');
await t.page.waitForFunction(() => document.querySelector('#issue_notes').value.includes('Open note text for everybody'));
await t.shot('applied', 'Apply puts the note template text into the notes');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('save note');
if (!(await t.page.locator('.journal .wiki', { hasText: 'Open note text for everybody' }).count())) fail('note from the template not saved');
await t.shot('saved', 'The note from the template is saved in the history');

await t.login('admin');
await t.go('/issues/1');
names = await openNotePopup();
if (!names.includes('E2E mine note')) fail(`admin (author) misses the "mine" note template: ${names}`);
await t.shot('popup-author', 'The author also gets the note template only visible to its author', { full: false });

// failure paths
await t.login('reporter');
await t.go('/issues/1');
await t.page.click('#content > .contextual a.icon-edit >> nth=0');
await t.page.waitForSelector('#issue_notes', { state: 'visible' });
if (await t.page.locator('#template_issue_notes').count()) fail('reporter gets the note template link');
await t.shot('reporter-no-link', 'Without show_issue_templates the edit form has no note template link (it used to open an empty popup with a 403)');
const probe = await t.page.evaluate(async id => {
  const token = document.querySelector('meta[name=csrf-token]').content;
  const r = await fetch('/note_templates/load', { method: 'POST', headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_template: { note_template_id: id } }) });
  const pre = document.createElement('pre');
  pre.textContent = `POST /note_templates/load (E2E open note) -> HTTP ${r.status}`;
  document.querySelector('#content').prepend(pre);
  return { status: r.status, body: await r.text() };
}, ids.note_templates['E2E open note']);
if (probe.status !== 404 || probe.body.includes('Open note text')) fail(`reporter loading a note template: HTTP ${probe.status}`);
t.check('reporter probe', { requests: ['404'] });
await t.shot('reporter-load-refused', 'Loading a note template without the permission is refused (HTTP 404, shown at the top)');
await t.go(`/projects/${P}/note_templates`, { status: 403 });
await t.shot('reporter-list-refused', 'The note template list is refused without the permission (403)');

await t.login('outsider');
await t.go('/projects/e2e-project');
const probe2 = await t.page.evaluate(async id => {
  const token = document.querySelector('meta[name=csrf-token]').content;
  const r = await fetch('/note_templates/load', { method: 'POST', headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_template: { note_template_id: id } }) });
  const pre = document.createElement('pre');
  pre.textContent = `POST /note_templates/load (E2E private note, open, private project) -> HTTP ${r.status}`;
  document.querySelector('#content').prepend(pre);
  return { status: r.status, body: await r.text() };
}, ids.note_templates['E2E private note']);
if (probe2.status !== 404 || probe2.body.includes('Confidential')) fail(`outsider loading the private note template: HTTP ${probe2.status}`);
t.check('outsider probe', { requests: ['404'] });
await t.shot('outsider-load-refused', 'An "open" note template of a private project is not given to a non-member (HTTP 404, shown at the top)');

await t.login('manager');
await t.go(`/projects/${P}/note_templates/${ids.note_templates['E2E private note']}`, { status: 404 });
await t.shot('cross-project-404', 'A note template of another project is not reachable through this project\'s URL (404)');

await t.done();
