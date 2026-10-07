// Settings: the plugin settings (Administration > Plugins, behind sudo mode on Redmine 7) with
// built-in fields and templates on the edit form, the built-in field generator on a template
// and its effect on a new issue, the project's template settings (help message, replace
// instead of append, inheritance) and inherited templates in a subproject. Refusals for a
// reporter. Restores the plugin settings at the end.
import { e2e } from '../../.codex/e2e/lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const t = await e2e('settings');
const fail = msg => t.problems.push(msg);
const flash = async (kind, re, what) => {
  const text = await t.page.locator(`#flash_${kind}, #errorExplanation`).first().innerText().catch(() => '');
  if (!re.test(text)) fail(`${what}: expected ${kind} ${re}, got ${JSON.stringify(text)}`);
};
const pluginSettings = async values => {
  await t.go('/settings/plugin/redmine_issue_templates');
  for (const [k, v] of Object.entries(values)) await t.page.setChecked(`#settings_${k}`, v);
  await t.page.click('#content input[type=submit][name=commit]');
  await t.settle();
  await t.sudo();
  t.check('save plugin settings');
};

await t.login('admin');
await t.go('/settings/plugin/redmine_issue_templates');
await t.shot('plugin-settings', 'The plugin settings: global templates for all projects, templates on the edit form, built-in fields');
await pluginSettings({ enable_builtin_fields: true, apply_template_when_edit_issue: true, apply_global_template_to_all_projects: false });
await flash('notice', /Successful update/, 'plugin settings');
await t.shot('plugin-settings-saved', 'Saved after confirming the password (sudo mode): built-in fields and templates on the edit form are on');

await t.login('manager');
await t.go(`/projects/${P}/issue_templates/${ids.issue_templates['E2E bug minimal']}`);
await t.page.waitForSelector('#field_selector option[value="issue_priority_id"]', { state: 'attached', timeout: 15000 })
  .catch(() => fail('built-in field selector has no Priority (load_selectable_fields failed?)'));
t.check('field selector');
await t.page.selectOption('#field_selector', 'issue_priority_id');
await t.page.selectOption('#value_selector', 'High');
await t.page.click('#json_generator .icon-add');
await t.page.click('#json_generator .icon-checked');
const json = await t.page.inputValue('#issue_template_builtin_fields');
if (!/"issue_priority_id":\s*\[?"High"\]?/.test(json)) fail(`built-in fields JSON is ${json}`);
await t.shot('builtin-generator', 'With built-in fields on, the template form offers the issue\'s fields and values (from load_selectable_fields) and builds the JSON: Priority = High');
await t.page.click('#edit-issue_template input[type=submit]');
await t.settle();
t.check('save builtin');
await flash('notice', /Successful update/, 'save built-in fields');

await t.go(`/projects/${P}/issues/new`);
await t.page.waitForSelector('#template_area', { state: 'visible' });
await t.page.selectOption('#issue_template', { label: 'E2E bug minimal' });
await t.page.waitForFunction(() => document.querySelector('#issue_priority_id option:checked')?.textContent === 'High', null, { timeout: 10000 })
  .catch(async () => {
    const priority = await t.page.locator('#issue_priority_id option:checked').allInnerTexts();
    const itil = await t.page.locator('#itil_priority_field').count();
    fail(`priority after the template: ${priority.join() || 'no #issue_priority_id'}${itil ? ' (priority field replaced by redmine_itil_priority)' : ''}`);
  });
await t.shot('builtin-applied', 'Choosing the template on a new issue also sets Priority to High');

await t.go('/issues/2');
await t.page.click('#content > .contextual a.icon-edit >> nth=0');
await t.page.waitForSelector('#template_area', { state: 'visible', timeout: 10000 })
  .catch(() => fail('no template pulldown on the edit form with apply_template_when_edit_issue'));
await t.shot('edit-form-pulldown', 'With "apply template when editing" on, the issue edit form has the template pulldown too', { full: false });

await t.go(`/projects/${P}/issue_templates_settings`);
await t.shot('project-settings', 'The project\'s template settings: inherit, replace instead of append, help message');
await t.page.check('#settings_should_replaced');
await t.page.fill('#settings_help_message', 'E2E help: pick the template that matches your report. (saved in the browser)');
await t.page.click('#issue_templates_settings input[type=submit]');
await t.settle();
t.check('project settings');
await flash('notice', /Successful update/, 'project settings');
await t.shot('project-settings-saved', 'The project settings are saved');

await t.go(`/projects/${P}/issues/new`);
await t.page.waitForSelector('#template_area', { state: 'visible' });
await t.page.fill('#issue_subject', 'Typed before choosing');
await t.page.selectOption('#issue_template', { label: 'E2E feature request' }).catch(() => {});
await t.page.selectOption('#issue_template', { label: 'E2E bug minimal' });
await t.page.waitForSelector('#issue_template_confirm_to_replace_dialog', { state: 'visible', timeout: 5000 })
  .catch(() => fail('no confirmation before replacing'));
await t.page.waitForTimeout(800); // the dialog fades in
await t.shot('replace-confirm', 'With "replace" on, choosing a template over typed text asks for confirmation first', { full: false });
await t.page.click('#overwrite_yes');
await t.page.waitForFunction(() => document.querySelector('#issue_subject').value === 'Minimal bug');
await t.shot('replaced', 'After Yes the subject and description are replaced, not appended');

await t.go('/projects/e2e-sub/issues/new');
await t.page.waitForSelector('#template_area', { state: 'visible' });
const inherited = await t.page.locator('#issue_template option.inherited').allInnerTexts();
if (!inherited.includes('E2E bug report')) fail(`subproject misses the inherited template: ${inherited}`);
if (inherited.includes('E2E bug minimal')) fail('subproject inherits a template that is not shared');
await t.shot('inherited', 'In the subproject the parent\'s shared template is offered as inherited (only the shared one)');
await t.go('/projects/e2e-sub/issue_templates');
await t.shot('inherited-list', 'The subproject\'s template list shows the inherited templates');

// refusals
await t.login('reporter');
await t.go(`/projects/${P}/issue_templates_settings`, { status: 403 });
await t.shot('reporter-settings-refused', 'The project template settings are refused without manage_issue_templates (403)');
await t.go(`/issue_templates/load_selectable_fields?project_id=${ids.projects[P]}&tracker_id=${ids.trackers.Bug}`, { status: 403 });
await t.shot('reporter-fields-refused', 'The project\'s fields, assignable users and watchers for the generator are refused to a reporter (403); they used to be returned to anyone');
await t.go('/settings/plugin/redmine_issue_templates', { status: 403 });

// restore
await t.login('admin');
await pluginSettings({ enable_builtin_fields: false, apply_template_when_edit_issue: false, apply_global_template_to_all_projects: false });
await t.login('manager');
await t.go(`/projects/${P}/issue_templates_settings`);
await t.page.uncheck('#settings_should_replaced');
await t.page.click('#issue_templates_settings input[type=submit]');
await t.settle();
t.check('restore');

await t.done();
