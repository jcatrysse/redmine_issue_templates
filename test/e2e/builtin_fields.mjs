// Built-in fields: the Vue field generator on the template forms (scripts/template_fields.js and
// scripts/components) and a template's built-in and custom fields applied to a new issue, the
// watchers included (the JavaScript of Redmine's watchers/append.js run on the form). A project
// template and a global template, a multiple list, a single list, watchers, deleting an entry,
// reset to the saved values; the generator absent with the setting off; refusals for a reporter.
// Restores the plugin settings and the template at the end.
import { e2e } from '../../.codex/e2e/lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const P = 'e2e-project';
const TEMPLATE = 'E2E builtin fields';
const component = `issue_custom_field_values_${ids.custom_fields['E2E component']}`;
const severity = `issue_custom_field_values_${ids.custom_fields['E2E severity']}`;
const reporterId = String(ids.users.reporter);
const t = await e2e('builtin-fields');
const fail = msg => t.problems.push(msg);
const pluginSettings = async values => {
  await t.go('/settings/plugin/redmine_issue_templates');
  for (const [k, v] of Object.entries(values)) await t.page.setChecked(`#settings_${k}`, v);
  await t.page.click('#content input[type=submit][name=commit]');
  await t.settle();
  await t.sudo();
  t.check('save plugin settings');
};
const builtinJson = async id => JSON.parse((await t.page.inputValue(id)) || '{}');
const waitForFields = async () => {
  await t.page.waitForSelector(`#field_selector option[value="${component}"]`, { state: 'attached', timeout: 15000 })
    .catch(() => fail('the generator offers no custom field (load_selectable_fields failed?)'));
};
const templateUrl = `/projects/${P}/issue_templates/${ids.issue_templates[TEMPLATE]}`;
const clearTemplate = async () => {
  await t.go(templateUrl);
  await waitForFields();
  await t.page.evaluate(() => { document.querySelector('#issue_template_builtin_fields').value = '{}'; });
  await t.page.click('#edit-issue_template input[type=submit]');
  await t.settle();
  t.check('clear the template\'s built-in fields');
};

// setting off: no generator (the template starts without built-in fields, also after an aborted run)
await t.login('admin');
await pluginSettings({ enable_builtin_fields: true });
await t.login('manager');
await clearTemplate();
await t.login('admin');
await pluginSettings({ enable_builtin_fields: false });
await t.login('manager');
await t.go(templateUrl);
if (await t.page.locator('#json_generator').count()) fail('generator shown with built-in fields off');
await t.shot('off', 'With built-in fields off in the plugin settings the template form has no field generator');

await t.login('admin');
await pluginSettings({ enable_builtin_fields: true });

// project template: build the JSON
await t.login('manager');
await t.go(templateUrl);
await waitForFields();
if ((await t.page.locator('#json_generator').count()) !== 1) fail('not exactly one #json_generator on the page');
await t.shot('generator-empty', 'The generator on a project template: field selector, value, Add, an empty list, Reset and Apply');

await t.page.selectOption('#field_selector', component);
const multiple = await t.page.locator('#value_selector').evaluate(e => e.multiple);
if (!multiple) fail('E2E component (multiple list) gives a single select');
await t.page.selectOption('#value_selector', ['Backend', 'UI']);
await t.shot('field-information', 'A multiple list custom field: a multiple select with its values and the field information below');
await t.page.click('#json_generator .icon-add');

await t.page.selectOption('#field_selector', severity);
if (await t.page.locator('#value_selector').evaluate(e => e.multiple)) fail('E2E severity (single list) gives a multiple select');
await t.page.selectOption('#value_selector', 'Major');
await t.page.click('#json_generator .icon-add');

await t.page.selectOption('#field_selector', 'issue_watcher_user_ids');
const reporterOption = await t.page.locator('#value_selector option').evaluateAll(
  (opts, id) => opts.map(o => o.value).find(v => v.endsWith(`:${id}`)), reporterId);
if (!reporterOption) fail('the watcher list does not offer the reporter');
await t.page.selectOption('#value_selector', [reporterOption]);
await t.page.click('#json_generator .icon-add');

await t.page.selectOption('#field_selector', 'issue_priority_id');
await t.page.selectOption('#value_selector', 'High');
await t.page.click('#json_generator .icon-add');
const listed = await t.page.locator('#fields_setting_display_area li').count();
if (listed !== 4) fail(`${listed} entries listed, expected 4`);
await t.shot('four-entries', 'Four entries added: E2E component (Backend, UI), E2E severity (Major), watcher (reporter), Priority (High)');

await t.page.locator('#fields_setting_display_area li', { hasText: 'High' }).locator('.icon-del').click();
const afterDelete = await t.page.locator('#fields_setting_display_area li').count();
if (afterDelete !== 3) fail(`${afterDelete} entries after deleting Priority, expected 3`);
await t.page.click('#json_generator .icon-checked');
const json = await builtinJson('#issue_template_builtin_fields');
const expected = { [component]: ['Backend', 'UI'], [severity]: ['Major'], issue_watcher_user_ids: [reporterId] };
if (JSON.stringify(json) !== JSON.stringify(expected)) fail(`JSON ${JSON.stringify(json)}, expected ${JSON.stringify(expected)}`);
await t.shot('applied-json', 'Priority deleted from the list; Apply writes the three remaining entries as JSON, the watcher as its user id');
await t.page.click('#edit-issue_template input[type=submit]');
await t.settle();
t.check('save template');

// saved values come back, reset drops what was not saved
await t.go(templateUrl);
await waitForFields();
const reloaded = await t.page.locator('#fields_setting_display_area li').count();
if (reloaded !== 3) fail(`${reloaded} entries after reload, expected the 3 saved`);
await t.page.selectOption('#field_selector', 'issue_priority_id');
await t.page.selectOption('#value_selector', 'Low');
await t.page.click('#json_generator .icon-add');
await t.page.click('#reset-json');
const reset = await t.page.locator('#fields_setting_display_area li').count();
if (reset !== 3) fail(`${reset} entries after Reset, expected the 3 saved`);
await t.shot('reloaded', 'After saving and reopening, the saved entries are listed again; Reset drops an unsaved entry');

// apply on a new issue: custom fields, watcher (watchers/append.js)
await t.go(`/projects/${P}/issues/new`);
await t.page.waitForSelector('#template_area', { state: 'visible' });
await t.page.selectOption('#issue_template', { label: TEMPLATE });
await t.page.waitForFunction(() => document.querySelector('#issue_subject').value.endsWith('Fields'));
await t.page.waitForSelector(`#watchers_inputs input[value="${reporterId}"]:checked`, { state: 'attached', timeout: 10000 })
  .catch(() => fail('watcher reporter not checked after the template (watchers/append.js)'));
const cid = ids.custom_fields['E2E component'];
const sid = ids.custom_fields['E2E severity'];
const comp = await t.page.locator(`#issue_custom_field_values_${cid} option:checked`).allInnerTexts();
if (comp.join() !== 'Backend,UI') fail(`E2E component after the template: ${comp}`);
const sev = await t.page.locator(`#issue_custom_field_values_${sid} option:checked`).allInnerTexts();
if (sev.join() !== 'Major') fail(`E2E severity after the template: ${sev}`);
t.check('apply template');
await t.shot('issue-form', 'Choosing the template on a new issue sets E2E component (Backend, UI), E2E severity (Major) and adds the reporter as a checked watcher');
await t.page.click('#issue-form input[name=commit]');
await t.settle();
t.check('create issue');
const watchers = await t.page.locator('#watchers').innerText().catch(() => '');
if (!/Reporter/.test(watchers)) fail(`created issue has watchers ${JSON.stringify(watchers)}`);
await t.shot('issue-created', 'The created issue has the custom field values and the reporter as watcher');

// global template generator
await t.login('admin');
await t.go(`/global_issue_templates/${ids.global_issue_templates['E2E global template']}`);
await t.page.waitForSelector('#field_selector option[value="issue_priority_id"]', { state: 'attached', timeout: 15000 })
  .catch(() => fail('global generator has no Priority'));
await t.page.selectOption('#field_selector', 'issue_priority_id');
await t.page.selectOption('#value_selector', 'Urgent');
await t.page.click('#json_generator .icon-add');
await t.page.click('#json_generator .icon-checked');
const gjson = await builtinJson('#global_issue_template_builtin_fields');
if (JSON.stringify(gjson) !== '{"issue_priority_id":["Urgent"]}') fail(`global JSON ${JSON.stringify(gjson)}`);
await t.shot('global-generator', 'The generator on a global template builds its JSON too (not saved)');

// refusals
await t.login('reporter');
await t.go(templateUrl, { status: 403 });
await t.shot('reporter-refused', 'A reporter cannot open the template with its generator (403)');
await t.go(`/projects/${P}/issues/new`);
if (await t.page.locator('#template_area:visible').count()) fail('reporter gets the template pulldown');
await t.shot('reporter-new-issue', 'A reporter\'s new issue form has no template pulldown, so no built-in fields are applied');

// restore
await t.login('manager');
await clearTemplate();
await t.login('admin');
await pluginSettings({ enable_builtin_fields: false });

await t.done();
