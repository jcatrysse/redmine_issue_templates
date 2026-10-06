// REST API: the template lists (issue templates with inherited and global ones, note
// templates), list_templates and load with an API key; refused for a reporter, a non-member
// and anonymous. The answers are shown in a page for the screenshot.
import fs from 'node:fs';
import path from 'node:path';
import { e2e, BASE } from '../../.codex/e2e/lib.mjs';

const ids = JSON.parse(fs.readFileSync(path.join(process.env.REDMINE_DIR || 'redmine', 'tmp', 'e2e-issue-templates.json')));
const t = await e2e('rest-api');
const fail = msg => t.problems.push(msg);
const rows = [];
const call = async (who, method, url, expect, check) => {
  const headers = who === 'anonymous' ? {} : { 'X-Redmine-API-Key': ids.api_keys[who] };
  const res = method === 'GET' ? await t.page.request.get(BASE + url, { headers })
    : await t.page.request.post(BASE + url, { headers: { ...headers, 'Content-Type': 'application/json' }, data: check.data || {} });
  const body = await res.text();
  let note = '';
  if (res.status() !== expect) fail(`${who} ${method} ${url}: HTTP ${res.status()}, expected ${expect}`);
  else if (check.has) for (const s of check.has) if (!body.includes(s)) { fail(`${who} ${method} ${url}: answer misses ${s}`); note = `misses ${s}`; }
  if (check.not) for (const s of check.not) if (body.includes(s)) { fail(`${who} ${method} ${url}: answer contains ${s}`); note = `contains ${s}`; }
  rows.push(`${who.padEnd(9)} ${method.padEnd(4)} ${url.padEnd(92)} HTTP ${res.status()} (expected ${expect}) ${note}`);
  return body;
};
const show = async (shotName, caption) => {
  await t.go('/projects/e2e-project');
  await t.page.evaluate(text => {
    const pre = document.createElement('pre');
    pre.style.fontSize = '11px';
    pre.textContent = text;
    document.querySelector('#content').replaceChildren(pre);
  }, rows.join('\n'));
  await t.shot(shotName, caption);
  rows.length = 0;
};

const P = 'e2e-project';
const privateTemplate = ids.issue_templates['E2E private template'];
await t.login('manager');
await call('manager', 'GET', `/projects/${P}/issue_templates.json`, 200, { has: ['E2E bug report', 'E2E global template'], not: ['E2E private template'] });
await call('manager', 'GET', `/projects/e2e-sub/issue_templates.json`, 200, { has: ['"inherit_templates"', 'E2E bug report'] });
await call('manager', 'GET', `/projects/${P}/note_templates.json`, 200, { has: ['E2E open note'] });
await call('manager', 'GET', `/projects/${P}/issue_templates/list_templates.json?issue_tracker_id=${ids.trackers.Bug}`, 200, { has: ['E2E bug minimal'] });
await call('manager', 'POST', `/issue_templates/load.json?project_id=${P}`, 200, { data: { template_id: ids.issue_templates['E2E bug minimal'] }, has: ['What happened?'] });
await call('admin', 'POST', `/issue_templates/load.json?project_id=${P}`, 200, { data: { template_id: privateTemplate }, has: ['Confidential'] });
await show('allowed', 'With an API key of a member with the permission: the lists (also the inherited templates of the subproject), list_templates and load answer 200 with the templates');

await call('reporter', 'GET', `/projects/${P}/issue_templates.json`, 403, {});
await call('reporter', 'GET', `/projects/${P}/note_templates.json`, 403, {});
await call('reporter', 'POST', `/issue_templates/load.json?project_id=${P}`, 403, { data: { template_id: privateTemplate }, not: ['Confidential'] });
await call('reporter', 'POST', `/issue_templates/load.json?project_id=${P}`, 403, { data: { template_id: ids.issue_templates['E2E bug minimal'] }, not: ['What happened?'] });
await call('outsider', 'GET', `/projects/e2e-private/issue_templates.json`, 403, { not: ['Confidential'] });
await call('outsider', 'POST', `/issue_templates/load.json?project_id=${P}`, 403, { data: { template_id: privateTemplate }, not: ['Confidential'] });
await call('anonymous', 'GET', `/projects/${P}/issue_templates.json`, 401, {});
await call('anonymous', 'POST', `/issue_templates/load.json?project_id=${P}`, 401, { data: { template_id: privateTemplate }, not: ['Confidential'] });
t.check('api refusals', { requests: ['401', '403'] });
await show('refused', 'Without the permission, without membership or without a key the same calls are refused (403/401) and return no template text; load used to answer 200 to anyone');

await t.done();
