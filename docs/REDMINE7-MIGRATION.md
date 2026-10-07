# Redmine 7 migration: redmine_issue_templates

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `redmine_issue_templates` |
| GEOxyz runs today | `master-geoxyz` |
| Upstream | agileware-jp/redmine_issue_templates master @ 87360e7db5f274b3572234c3e1806aeb2772f409 (2026-09-24) |
| Runs on Redmine 7 as is | JA (runtime); tests needed two fixes |
| Upstream sync | SYNC AANBEVOLEN: upstream master 87360e7 merged into master-geoxyz (on redmine70-migration): legacy-icons-compat.css only on plugin screens, REST index via api format, CI; no conflicts, GEOxyz's 3 commits intact |
| After sync | JA |
| Complexity (1 trivial .. 5 rewrite) | 1 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `30ff6e7` |
| Round 2 (2026-10-07, Jan: "Nu meteen herstellen") | DONE: 9 small upstream bugs fixed, one commit each with a test that fails without it (1957c44..f815d42); 2 review findings were no bug. Tests 112 runs, 155 examples, 0 failures; e2e 123 screenshots, 0 problems; OpenAI review 5 findings, none a bug. See "Round 2: the small upstream bugs" |
| Decisions of Jan (2026-10-07) | DONE: icons switched to Redmine 7's SVG sprite (7b8f748, c097447), workflows manual only (3cd03db), no-offer and API 'name' recorded; PostgreSQL only from here. Tests green alone and with 30 other GEOxyz plugins; e2e 115 screenshots, 0 problems alone. See "Session of 2026-10-07" |
| Migration session (2026-10-06) | DONE, see "Result of the migration session" below. Tests green on PostgreSQL and MariaDB (Redmine 7.0-stable-GEOxyz) and on 5.1-stable; e2e 105 screenshots, 0 problems on both databases; OpenAI review 3 rounds |

## Already on this branch

- `6522c8b` Merge upstream agileware-jp/redmine_issue_templates master (87360e7) for Redmine 7
- `c496176` Stop defining ActiveRecord::Base.open in the spec helper

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

1. DONE 50ebdcb. settings_controller_spec.rb:28,33 fail on R7: Redmine::SudoMode.disable! in before() is reset per request (CurrentAttributes) and sudo is on by default; the spec now stubs `SudoMode.enabled?` like core's test_helper (also fine on 5.1).
2. DONE. The 43 selenium feature specs run with Chrome for Testing 155 + chromedriver 155 (root needs `--no-sandbox`; a wrapper through `SE_BROWSER_PATH`, and the mismatched chromedriver 147 off PATH): all pass. One of them is intermittent, see "Open items".
3. NOTED. Plugin Gemfile swaps core's commonmarker pin to ~> 2.6 only when RubyGems >= 4 (upstream a5ea172). Here RubyGems 3.5.22, inactive. Listed under "After the upgrade".

**Checks**

4. DONE. See "Test results".
5. DONE, nothing needed. The plugin does not patch Issue, issues/show.api.rsb or any issue data: templates only prefill the issue form in the browser, the saved issue is plain core data, so core webhook payloads are complete and consistent.
6. DONE. See "Inventory of functions" and docs/e2e.

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject | verdict |
|---|---|---|---|
| `751e719` | 2026-01-16 | Rename Gemfile.local to Gemfile (needed for correct handling of gem dependencies) | KEEP, partly rewritten. Its `ActiveRecord::Base.open` stub broke the whole rspec run on Rails 8.1 and was removed in c496176. The remaining `autoload_paths.dup` lines in `spec/rails_helper.rb` are not needed on Redmine 7 (feature specs pass without them, tried) but are guarded and harmless; kept for 5.1/6.1. |
| `82f6b59` | 2025-11-24 | Rename Gemfile.local to Gemfile (needed for correct handling of gem dependencies) | KEEP, fixed. Redmine only loads `plugins/*/{Gemfile,PluginGemfile}`, so the rename is needed for the test gems. But the inherited `dependencies.reject! nokogiri` then ran in every environment and dropped Redmine's own nokogiri pin from the production bundle: removed in 678b0f2, with `test/unit/plugin_gemfile_test.rb` (every top-level gem of core's Gemfile stays in the bundle; failed on nokogiri before). |
| `fe92817` | 2025-11-24 | DB migration optimization | KEEP. Upstream lacks the guard; it lets `redmine:plugins:migrate` pass on a database where the table was already renamed. Test added in 88ff916 (both directions, with and without the existing table; 2 of 4 fail on the unguarded migration). Down/up run on PostgreSQL and MariaDB. |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- No data migration and no new setting. `rake redmine:plugins:migrate` has nothing new for this plugin (no new migration on this branch).
- Run `bundle install` after updating the plugin: its Gemfile no longer removes Redmine's nokogiri pin, so the bundle follows core's `nokogiri ~> 1.19.1` again. Keep `bundle config set without 'development test'` in production: the plugin Gemfile declares rspec, factory_bot, pry and others in those groups.
- If production ever runs RubyGems >= 4, the plugin Gemfile replaces core's commonmarker pin with `~> 2.6` (upstream a5ea172).
- The plugin's icons are now Redmine 7's SVG icons; it no longer loads legacy-icons-compat.css and ships no PNG icons. Nothing to configure. A theme that styled the plugin's old `icon-template`/`icon-erase` background images has nothing left to style.
- With redmine_itil_priority installed, a template's built-in field for Priority has no effect: that plugin replaces the priority select by its own widget (computed from impact and urgency). Set impact/urgency through custom fields in the template instead, if needed.
- Behaviour users may notice (all are authorization fixes, see "Result"): non-administrators can no longer create, change or delete global templates; templates of another project are no longer reachable by id; members without "Show issue templates" no longer get the note template link on issues; template loading is limited to what the form offers in that project.
- REST: `GET /projects/<id>/note_templates.json` now works (it answered 500) and returns the template's name under `name`; `issue_templates.json` works again for projects with inherited templates.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: GEOxyz runs PostgreSQL 16 only (decided by Jan, 2026-10-07): tests, migrations
   (reversible, run down and up) and the e2e set on PostgreSQL. Keep SQL portable where that costs
   nothing; a MariaDB/MySQL-only problem is a note here, not a blocker.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **No Redmine 5.1** (decided by Jan, 2026-10-07): GEOxyz goes straight to Redmine 7; nothing is
  backported or cherry-picked to the default branch or the branch production runs today, and
  `redmine70-migration` goes live with Redmine 7. Do not add code paths that exist only for 5.1.
- **Core patches**: a Redmine core method that other installed plugins also patch is patched with
  `prepend`, never with `alias_method` (decided by Jan, 2026-10-07).
- **deface**: a plugin that depends on deface requires it without a version constraint.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL, alone and with the
  other GEOxyz plugins installed (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Result of the migration session (2026-10-06)

### Commits (in order)

| commit | what |
|---|---|
| 50ebdcb | spec: sudo mode off the way core's tests do (work list 1) |
| 678b0f2 | Gemfile: keep Redmine's nokogiri pin (GEOxyz 82f6b59 review) |
| 88ff916 | test for the guarded rename migration (GEOxyz fe92817 review) |
| 8dacdd6 | security: admin required for every write on global issue/note templates (create/update/destroy were open to any user) |
| 21c76a5 | security: project templates only through their own project (show/update/destroy/copy of any project's template by id) |
| e60784b | security: permission checks on issue_templates#load, load_selectable_fields, set_pulldown/list_templates (issue_project_id) and note_templates#load |
| 0d9ed53 | note template link on issues only with show_issue_templates (it opened an empty popup with a 403) |
| 376dbf6 | REST: issue_templates.json with inherited templates and note_templates.json answered 500 |
| cb732a1 | security: global templates loadable only where they are offered (found in own review) |
| 7cd3445 | security: template loading tied to the project of the issue form (OpenAI review) |
| f77fa86 | issue form script: template URLs unescaped (`&amp;project_id` lost the project; found by the e2e run) |
| 7a9aae6, 1cfe0cb, 039858b, bfe4e80, 5f7d515, 81b8c76, 4153a01 | e2e seed, scenarios and evidence |
| cd0edea, 38f4d62 | OpenAI review resolutions |

All authorization holes were pre-existing (upstream agileware and master-geoxyz on 5.1 alike, proven in docs/e2e/before); each fix has a test that failed before. No new gem, setting, locale string or schema change. Every fix also runs on Redmine 5.1.

### Baseline (before any change, 7.0-stable-GEOxyz, PostgreSQL)

- minitest 77 runs, 298 assertions, 0 failures; rspec 149 examples, 45 failures (43 feature specs: chromedriver/Chrome mismatch and root sandbox; 2 settings specs: sudo mode). With a matching Chrome: 149 examples, 2 failures (the sudo specs).
- Real Redmine (production mode): smoke 30 screenshots / 0 problems, core flows 6 / 0.

### Test results (final head f77fa86 for the code)

| Redmine | DB | minitest | rspec (incl. 43 selenium feature specs) |
|---|---|---|---|
| 7.0-stable-GEOxyz (7.0.1, Rails 8.1.3.1, Ruby 3.3.6) | PostgreSQL 16 | 102 runs, 377 assertions, 0 failures, 0 errors | 149 examples, 0 failures, 2 pending (pending upstream) |
| 7.0-stable-GEOxyz | MariaDB 10.11 | 102 runs, 377 assertions, 0 failures, 0 errors | 149 examples, 0 failures, 2 pending |
| 5.1-stable (Ruby 3.2.6) | PostgreSQL 16 | 102 runs, 335 assertions, 0 failures, 0 errors | 149 examples, 0 failures, 2 pending |

- Boot and eager load: the production server (eager load on) starts on both databases.
- Migrations: `redmine:plugins:migrate NAME=redmine_issue_templates VERSION=0` (31 reverted, no plugin table left) and back up (31 migrated, 7 tables) on PostgreSQL and on MariaDB.
- Rake tasks on the running instance: `apply_inhelit_template_to_child_projects[1]` / `unapply_...[1]` switch inherit_templates of e2e-sub true/false; with an unknown project id the task prints "IssueTemplateSetting to project specified by 999 does not exist."

### End to end (real Redmine 7, production mode, `start_server.sh --reset`)

| run | smoke | core | plugin scenarios | problems |
|---|---|---|---|---|
| PostgreSQL (screenshots committed in docs/e2e) | 30 | 6 | 69 (6 scenarios) | 0 |
| MariaDB (tables in docs/e2e/mariadb) | 30 | 6 | 69 | 0 |
| before: master-geoxyz on Redmine 5.1 (docs/e2e/before) | - | - | 56 (5 scenarios) | 21 failed checks = the holes fixed here, see docs/e2e/before/README.md |

Every screenshot was looked at. Findings from looking: Textile seed text on a CommonMark instance (seed fixed), popups caught mid fade-in (waits added), the reporter's empty note popup (fixed, 0d9ed53), the REST 500s (fixed, 376dbf6), the lost project_id after a tracker switch (fixed, f77fa86).

### Inventory of functions

| function | how a user reaches it | scenario | screenshots (docs/e2e) |
|---|---|---|---|
| Template pulldown on the new issue form, default template, apply, revert, erase | Issues > New issue | new_issue_template.mjs | new-issue-template-default-applied, -second-applied, -reverted |
| Filter dialog (list and filter templates of the tracker) | "Preview Template Contents" next to the pulldown | new_issue_template.mjs | new-issue-template-filter-dialog |
| Help message of the project | "About templates" next to the pulldown | new_issue_template.mjs, settings.mjs | new-issue-template-help-message |
| Templates per tracker, tracker switch, save the issue | tracker select on the form | new_issue_template.mjs | -feature-tracker, -issue-created |
| Global templates in the pulldown | pulldown, class "global" | new_issue_template.mjs, global_templates.mjs | global-templates-issue-in-project |
| Refusals on the form: no pulldown without permission, load/set_pulldown of a private project's template, non-member | as reporter / outsider | new_issue_template.mjs | -reporter-no-pulldown, -reporter-load-refused, -outsider-refused |
| Project issue templates: list, create (validation), show/edit, copy, delete (disabled only), orphaned list | Project > Issue templates | project_issue_templates.mjs | project-issue-templates-list, -create-invalid, -created, -updated, -copy, -deleted, -delete-enabled-disabled, -delete-enabled-refused, -orphaned |
| Sidebar links on the issue list | Issues sidebar | project_issue_templates.mjs | -sidebar, -reporter-sidebar |
| Refusals: reporter, outsider, cross-project id and copy_from | direct URLs | project_issue_templates.mjs | -reporter-refused, -outsider-refused, -cross-project-404 |
| Drag & drop reorder | sort handle in the lists | rspec spec/features/drag_and_drop_spec.rb (4 examples) | (rspec) |
| Note templates in a project: list, create with role visibility, edit, delete | Project > Issue templates > Template for note | note_templates.mjs | note-templates-list, -new-roles, -created, -updated, -deleted |
| Note templates on an issue: popup (open/roles/mine/global), apply, save | Issue > Edit > "Template for note" | note_templates.mjs | -popup, -applied, -saved, -popup-author |
| Refusals for note templates (no link, load 404, private open note, cross-project) | as reporter / outsider | note_templates.mjs | -reporter-no-link, -reporter-load-refused, -reporter-list-refused, -outsider-load-refused, -cross-project-404 |
| Global issue templates (admin): list, create with project assignment, edit, delete | Administration > Global Issue Templates | global_templates.mjs | global-templates-admin-menu, -issue-list, -issue-create-invalid, -issue-new, -issue-created, -issue-updated, -issue-deleted |
| Global note templates (admin) | Global Issue Templates > Global Template for note | global_templates.mjs | -note-list, -note-created, -note-delete-enabled |
| Refusals for global templates (pages and writes as manager/reporter) | direct URLs / forged form posts | global_templates.mjs | -manager-refused, -manager-create-refused, -manager-update-refused, -reporter-refused, -unchanged |
| Plugin settings (all projects, templates on edit, built-in fields), behind sudo mode | Administration > Plugins > Configure | settings.mjs | settings-plugin-settings, -plugin-settings-saved |
| Built-in field generator (load_selectable_fields) and applying built-in fields | template form with built-in fields on | settings.mjs | -builtin-generator, -builtin-applied, -reporter-fields-refused |
| Template pulldown on the issue edit form | setting "Use templates when edit issue" | settings.mjs | -edit-form-pulldown |
| Project template settings: inherit, replace (with confirmation), help message | Project > Issue templates > Settings | settings.mjs | -project-settings, -project-settings-saved, -replace-confirm, -replaced, -reporter-settings-refused |
| Inherited templates in a subproject | subproject new issue / template list | settings.mjs | -inherited, -inherited-list |
| REST API: issue_templates.json, note_templates.json, list_templates.json, load.json; 403/401 refusals | API key | rest_api.mjs | rest-api-allowed, rest-api-refused |
| Rake tasks apply/unapply inherit to child projects | command line | run by hand, see "Test results" | - |
| Every plugin page as admin | routes | .codex/e2e/smoke.mjs | smoke-01..30 |
| Redmine 7 SVG icons on every plugin screen (decision q3), no legacy CSS or PNG; refusals for reporter and outsider | admin menu, global and project pages, forms, issue form, popups | icons.mjs | icons-admin-menu, -global-issue-templates, -global-issue-template-form, -project-issue-templates, -template-show, -issue-form, -dialog-apply, -note-popup, -reporter, -outsider |

No mail, cron, macro or webhook in this plugin.

### Together with other GEOxyz plugins

Redmine 7.0-stable-GEOxyz on PostgreSQL with redmine_issue_field_visibility, redmine_depending_custom_fields, redmine_view_issue_description and redmine_custom_workflows (all `redmine70-migration`, 2026-10-06): this plugin's scenarios for global templates, the new issue form, project templates, REST API and settings passed (0 problems). Finding for **redmine_view_issue_description**: its permission makes `issues#show` answer 403 to members whose role lacks it (core Reporter role, Redmine's test fixtures), so the generic core flow (reporter on /issues/1), this plugin's note template scenario at the reporter step, 2 minitests and 9 update_issue feature specs that open an issue as such a user fail in that combination. That is the other plugin's intended behaviour, not a fault here; worth a look in that plugin's migration (its interplay with roles that only have view_issues).

### Review

- Own adversarial review of the whole diff: found the open global template load (fixed cb732a1) and, through the e2e run, the escaped URL (f77fa86).
- OpenAI review (gpt-5) on 6522c8b..HEAD, 3 rounds, docs/reviews/openai-2026-10-06-*.md: round 1 one finding fixed (7cd3445), one declined (premise wrong, Redmine's Project.find resolves identifiers; it did expose a weaker lookup of mine, replaced); round 2 one declined (Gemfile test, both core Gemfiles checked); round 3 two declined (both premises checked in code and on the running server). Every finding has a Resolution line.

### Open items (not done, with reason)

- `spec/features/drag_and_drop_spec.rb:24` (issue templates) is intermittent in this container: in failing runs no mousedown reaches the page at all (a capture listener on document saw nothing, while elementFromPoint is the sort handle; in passing runs mousedown, sortstart and sortupdate fire). Fails on the code before any change of this branch too, on 7.0 and 5.1; the final runs on PostgreSQL, MariaDB and 5.1 passed. Test left unchanged; looks like chromedriver input timing, not the plugin.
- Not changed, noted: `apply_global_template_to_all_projects` only tested as a setting plus the
  load rule (templates hide global ones when the project has its own, upstream behaviour). The
  other items noted here before (tracker_name, orphaned message, the review's JS bugs) were fixed
  in round 2, see below.
- `spec/rails_helper.rb` still has the guarded autoload_paths.dup lines of GEOxyz 751e719, kept
  "for 5.1/6.1"; not needed on Redmine 7 (tried) and could go now that 5.1 is dropped.
- Kit issues met (2026-10-07): a `public/assets/.manifest.json` left by an earlier production start
  makes the test environment serve the old precompiled JS (two feature specs failed until the
  server was started again); `redmine_clone.sh` with another `REDMINE_DIR` copies the default
  `redmine/` checkout and `node_modules` into that instance's plugin folder (removed by hand).
- Kit issues met: `.codex/test_setup.sh` runs `$SUDO -u postgres` with an empty `$SUDO` as root (role created by hand, then `RMP_PROVISION_DB=0`); rsync was missing; a server from another `REDMINE_DIR` on port 3000 makes `start_server.sh` report success while the old server keeps answering.

## Session of 2026-10-07 (Jan's decisions)

### Commits

| commit | what |
|---|---|
| 8678766 | Jan's decisions recorded by the coordinating session (docs/DECISIONS-2026-10-07.md) |
| 7b8f748 | q3: every icon from Redmine 7's SVG sprite; legacy-icons-compat.css and the plugin's PNGs gone; Vue generator and "template applied" message get server-rendered sprites; handlers read event.currentTarget; JS bundle rebuilt (unchanged sources rebuild byte for byte). Test: layout_test (failed before) |
| c097447 | q3: project list toggle in the global template forms gets core's angle arrow and flips it (found by icons.mjs). Test: layout_test |
| f11c9b7 | e2e scenario icons.mjs |
| 3cd03db | general: the two inherited upstream workflows (check-assets-js on pull_request, greetings on issues) now workflow_dispatch only. Test: github_workflows_test (failed before) |
| f9ec8d5 | combined run: the rspec setup restores Redmine's built-in groups after truncating (with redmine_stealth /login answered 500 in tests). Test: spec/models/builtin_groups_spec (failed before) |
| 4e175be | combined run: test roles get view_issue_description when redmine_view_issue_description is installed (11 tests failed in the combination) |
| 7493da5 | e2e seed and settings scenario for the combined run |
| 7b2cfa4 | e2e evidence, full PostgreSQL run |

q1 and q2 need no code (recorded under "Decided by Jan"). deface: not used. alias_method: none in this plugin.

### Tests (Redmine 7.0-stable-GEOxyz, PostgreSQL 16)

| run | minitest | rspec (incl. 43 selenium feature specs) |
|---|---|---|
| this plugin alone | 104 runs, 410 assertions, 0 failures, 0 errors | 150 examples, 0 failures, 2 pending (upstream) |
| with 30 other GEOxyz plugins (all public ones with a `redmine70-migration` branch, 2026-10-07) | 104 runs, 410 assertions, 0 failures, 0 errors | 150 examples, 0 failures, 2 pending |

The 30: redmine_plugin_computed_custom_field, redmine_drawio, redmine_mermaid_macro, redmine_ai_summary,
redmine_extended_api, bless-this-redmine-sso, redmine_wiki_extensions, redmine_view_issue_description,
redmine_more_previews, redmine_itil_priority, redmine_issue_field_visibility, redmine_mail_digest,
redmine_ldap_sync, redmine_parent_child_filters, redmine_issue_view_columns, redmine_subtask,
redmine_inline_edit_issues, redmine_stealth, redmine_custom_workflows, redmine_issue_todo_lists2,
redmine_reporter_dashboards, redmine_paste_as_wiki_tables, redmine_project_workflows,
redmine_tint_issues, redmine_user_specific_theme, redmine-view-customize, redmine_editauthor,
redmine_description_macros, redmine_impersonate, redmine_depending_custom_fields. The private ones
(redmine_agile, redmine_checklists, redmine_contacts, redmine_contacts_helpdesk, redmine_people,
redmine_tags, redmine_zenedit, redmine_ai_triage, redmine_context_menu_actions) were not reachable
from this session (no read access) and are not in the run.

### End to end (real Redmine 7, production mode, PostgreSQL, `start_server.sh --reset`)

| run | scenarios | screenshots | problems |
|---|---|---|---|
| alone (committed in docs/e2e) | smoke, core + 7 plugin scenarios | 115 | 0 |
| with the 30 plugins | the same | 115 | 2, both from other plugins (below) |

Every screenshot of the alone run was looked at after the icon switch.

Findings of the combined run, none caused by this plugin:
- **Project > Settings answers HTTP 500**: `undefined method dcf_relevant_custom_fields` in the
  settings tab of **redmine_depending_custom_fields**. It does
  `ProjectsHelper.include(ProjectCustomFieldConfigurationHelper)` after ProjectsHelper is already
  mixed into the view class, so the tab cannot see its helper (Ruby does not propagate a later
  include). With only 4 plugins (2026-10-06) the page answered 200, so it depends on load order.
  This plugin does not touch ProjectsHelper or project_settings_tabs and loads after it. The issue
  list and an issue page answer 200 in the combination (smoke and core flows).
- **redmine_itil_priority** replaces the priority select, so a template's built-in Priority value
  is not applied (settings.mjs reports it). See "After the upgrade".
- **redmine_view_issue_description**: opening an issue needs its permission; the e2e seed now grants
  it to the Reporter role when the plugin is present, as GEOxyz roles have it.
- Test environment only: **redmine_stealth**'s menu condition needs Redmine's built-in groups
  (fixed on this side, f9ec8d5); a shoulda-context 2.0 test gem from another plugin crashes
  minitest's reporter at the first failure, so one failure hides the rest of a combined minitest run.

### Review of 2026-10-07

- Own review of the new commits: nothing further found; escaping of the server-rendered svg markup
  (`j` in the script, `to_json` for the generator) checked.
- OpenAI review (gpt-5) of 8678766..7b2cfa4: docs/reviews/openai-2026-10-07-7b2cfa4.md, 9 findings,
  all on pre-existing upstream code that the rebuilt bundle brought into the diff; 0 accepted for
  this change, each with a Resolution line. The real ones are listed under "Open items".

### Open questions for Jan

None open. All answered on 2026-10-07, see "Decided by Jan".

### Decided by Jan (2026-10-07)

Answered by Jan Catrysse on 2026-10-07 in the coordinating session
(https://claude.ai/code/session_01GiSsYPm3bxvqrpZkdCxNoi), recorded in docs/DECISIONS-2026-10-07.md;
his notes verbatim. Final.

General, for every GEOxyz plugin:
- Straight to Redmine 7, no backports to 5.1, nothing cherry-picked to the default branch or the
  branch production runs today; `redmine70-migration` goes live with Redmine 7; no 5.1-only code
  paths. Rules updated. The 5.1 numbers and before pictures above stay as history.
- PostgreSQL 16 only; MariaDB/MySQL runs no longer required. Rules updated. The earlier MariaDB
  results stay as history.
- deface without a version constraint: not applicable, this plugin does not use deface.
- `prepend`, never `alias_method`, for core methods other plugins also patch: checked, this plugin
  has no `alias_method` and patches no core method (only view hooks, its own controllers and
  models). Project > Settings, the issue list and an issue page answer 200 with the other GEOxyz
  plugins installed (see "Together with other GEOxyz plugins").
- GitHub Actions manual only: unchanged, the workflow keeps `workflow_dispatch` only.

This plugin:
1. **q1, offer the closed authorization holes to agileware-jp?** Jan chose B: "Niet aanbieden,
   alleen bij GEOxyz" (De lekken worden niet publiek gemaakt, maar andere installaties blijven
   kwetsbaar en GEOxyz houdt de fixes zelf bij.). No code: nothing is reported or offered upstream.
   GEOxyz keeps the fixes on its own branch; at every upstream sync check that they survive
   (the functional tests of 8dacdd6, 21c76a5, e60784b, cb732a1, 7cd3445 fail if one is lost).
2. **q2, note_templates.json: 'name' or also 'title'?** Jan chose A: "Alleen 'name' (zo laten)"
   (Gelijk aan de veldnaam in de plugin, zonder extra werk.). Already built in 376dbf6, kept.
3. **q3, when to switch to Redmine 7's icons?** Jan chose C: "Nu meteen omzetten" (Nieuwe iconen al
   bij de upgrade, maar een grote herschrijving van de schermen vlak ervoor.). Built:
   7b8f748 (every icon from the SVG sprite, legacy-icons-compat.css and the plugin's PNGs gone, JS
   bundle rebuilt) and c097447 (project list toggle arrow), tested by
   test/integration/layout_test.rb and the e2e scenario test/e2e/icons.mjs.

### Round 2: the small upstream bugs (decided and done 2026-10-07)

Jan chose "Nu meteen herstellen" (docs/DECISIONS-2026-10-07.md, Round 2): fix now the small bugs
the reviews found in the original plugin, one commit per bug with a test that fails without it.
Feature specs in spec/features/template_fixes_spec.rb, e2e scenario test/e2e/fixes.mjs (screenshots
docs/e2e/fixes-*.png, looked at).

| # | Bug | Commit | Test that fails without it |
|---|---|---|---|
| 1 | Delete link of an enabled global note template: tooltip in `name` instead of `title` | 1957c44 | functional global_note_templates; e2e fixes-global-note-delete-title |
| 2 | list_templates.json: `tracker_name` of a global template was the tracker id | a6e0134 | functional issue_templates (API); e2e fixes-list-templates-tracker-name |
| 3 | Tracker name put unescaped into the issue form's script (`html_safe`) | 4c36c42 | functional issues (tracker `Bug's </script>`) |
| 4 | Note template hook took no project from a journal-only context | 418636f | unit journals_hook |
| 5 | New template form said "Orphaned template from tracker" | 8d0c73f | 4 functional tests; e2e fixes-new-template-not-orphaned |
| 6 | Default template appended again after a refused new issue (#errorExplanation check never true) | 0b9ab5e, f815d42 | 2 feature specs; e2e fixes-refused-issue-keeps-text, -choose-template |
| 7 | Generator: text box for date fields ('data' for 'date') | cc7f0aa | feature spec; e2e fixes-generator-date |
| 8 | Generator: fields not checked again after a tracker change | c9f78aa | feature spec; e2e fixes-generator-tracker-change |
| 9 | Revert did not restore CKEditor (jQuery text() on a DOM node) | 3a3e22c | feature spec with a stubbed CKEDITOR; e2e fixes-revert-ckeditor |

f815d42 came from the own review of 0b9ab5e: the pulldown and the dialog use the same change event,
so after a refused form a template the user chose was ignored too; only the automatic load after
setPulldown is skipped now.

Not a bug, nothing changed:
- Single-select substring match in FieldValue.vue (`value.includes(val)`): with Vue 2.7 the select
  always emits an array and the model is `''` or that array, so a string never reaches it.
- Pointer cursor on the dialog's apply arrow: `.template-update-link { cursor: pointer; }` is in the
  plugin's CSS; the stray text in the class attribute has no effect.
- Seen, harmless: `%(start_date due_date).include?(field)` in issue_templates_common.rb is a string,
  not an array, so it is a substring test; it gives the right answer for every core field.

Tests (7.0-stable-GEOxyz, PostgreSQL 16, alone): 112 runs, 428 assertions, 0 failures, 0 errors;
155 examples, 0 failures, 2 pending (upstream). E2E (`start_server.sh --reset`, `e2e.sh`): smoke 30,
core 6, fixes 8, global-templates 16, icons 10, new-issue-template 10, note-templates 14,
project-issue-templates 14, rest-api 2, settings 13 screenshots, 0 problems. OpenAI review of
7b9870a..f815d42 (docs/reviews/openai-2026-10-07-f815d42.md): 5 findings, none a bug (the orphan
message sits inside the `tracker.blank?` branch; Journal has `belongs_to :issue`), each with a
Resolution line. The run together with the other GEOxyz plugins was not repeated for round 2.

## Analysis report (2026-10-06, Dutch)

# redmine_issue_templates
- Gebruikte branch: master-geoxyz @ 751e719 (2026-01-16) - plugin id redmine_issue_templates, versie 1.2.2
- Upstream: agileware-jp/redmine_issue_templates - upstream HEAD master @ 87360e7 (2026-09-24)
- Fork t.o.v. upstream: 3 eigen commits (fe92817 DB migration optimization, 82f6b59 + 751e719 Gemfile.local -> Gemfile, inclusief spec/rails_helper-hacks), 13 upstream-commits ontbreken. Fork-`master` (a3c30b0) is voorouder van upstream master.
- Andere relevante branches: upstream `rails8-compatibility-run-ci*`, `refactor_remove_unused_model`, `fix/template-popup-scroll`, `devin/...` (werk-branches, al in master of niet relevant). Fork: `0.3-stable` en oude feature-branches (niet relevant).

## 1. Werkt out of the box op Redmine 7?   JA (runtime) - specs breken
- Harness met gecorrigeerde rspec-stap (`results/1006-094120-s1-redmine_issue_templates_origin_master-geoxyz`): boot OK, eager OK, migraties dev+test OK, minitest 77 runs / 298 assertions / 0 failures / 0 errors, smoke 79/79 (19 plugin-routes; 6x INFO 404 = record-id 1 bestaat niet in de seed).
- `FAIL rspec: 0 examples, 0 failures, 1 error occurred outside of examples`: GEOxyz-commit 751e719 definieert in `spec/rails_helper.rb` een `ActiveRecord::Base.open`-stub. Rails 8.1 ziet daardoor `enum visibility: { ..., open: 2 }` (`app/models/global_note_template.rb:35`, `note_template.rb`) als conflict -> ArgumentError bij het laden van het model, de hele suite stopt. Alleen testcode; runtime niet geraakt.

## 2. Upstream sync?   SYNC AANBEVOLEN
- Wat: upstream master 87360e7 (`87360e7db5f274b3572234c3e1806aeb2772f409`) -> merge in master-geoxyz (gedaan op `redmine70-migration`).
- Upstream-commits die ontbreken: R7-compat: 0645336 legacy-icons-compat.css alleen op de schermen van de plugin (nu op elke pagina, ook core), 5bb3da8 admin-menu-icoon zonder legacy CSS. Bugfix: 7202336/60c4c1d/4d2fbb5 REST index rendert via `format.api` i.p.v. `formats: :json`. CI/test: 6696667, 093dca7, 3787617, a5ea172 (RubyGems 4: commonmarker ~> 2.6 in de plugin-Gemfile), 2b4133f (spec login-helper). Merges: 26fe312, 87360e7, 5a4dfb6.
- Conflicten: geen. GEOxyz-commits blijven intact (`git diff 87360e7 6522c8b` = alleen Gemfile i.p.v. Gemfile.local, guarded `rename_table` in 20230330055341, spec/rails_helper). De commonmarker-wijziging van upstream is mee-gemerged in GEOxyz' `Gemfile`.

## 3. Werkt na sync op Redmine 7?   JA
- Harness `r70/trial-upstream`: identiek aan Q1 (77 runs / 0 failures, smoke 79/79).
- Functioneel in de browser (redmine70-migration): template aangemaakt, op `/projects/geoxyz-verify/issues/new` verschijnt `#issue_template` ("---|R7 template"). Kiezen vult subject en description ("From template" / "Template body *bold* line"). REST `GET /projects/geoxyz-verify/issue_templates.json` = 200 met correcte JSON, `note_templates.json` = 200. Raster-iconen op pluginpagina's via legacy-icons-compat (png geladen).

## 4. Complexiteit en blokkers   score 1
- Blokkers runtime: geen.
- Blokker testsuite: `spec/rails_helper.rb` (751e719) `ActiveRecord::Base.open`-stub - gefixt in c496176 (stub verwijderd). Daarna laadt de suite: 149 examples, 45 failures:
  - 43 in `spec/features/*` = omgeving: `Selenium::WebDriver::Error::SessionNotCreatedError`, chromedriver 147 in PATH vs Chrome 154 van selenium-manager.
  - 2 in `spec/controllers/settings_controller_spec.rb:28,33`: de spec zet `Redmine::SudoMode.disable!` in `before`, maar op R7 is SudoMode een `CurrentAttributes` die per request reset, en sudo staat standaard aan (#44052). Response is "Confirm your password". De spec legt R5-gedrag vast, geen pluginfout; niet aangepast.
  - Niet-feature specs alleen: 106 examples, 2 failures (dezelfde twee).
- Stille breuken:
  - Raster-iconen `class='icon icon-*'` in alle pluginviews (bv. `app/views/common/_template_links.html.erb:8-28`, `icon-help` in de forms). Opgevangen door `legacy-icons-compat.css`, upstream laadt die sinds 0645336 alleen op de schermen van de plugin (issues new/edit/show + templatecontrollers).
  - `serialize :builtin_fields_json` en `enum` staan achter Rails-versiechecks (`issue_template_common.rb:49`, `note_template.rb:34`, `global_note_template.rb:35`), dus OK.
  - Plugin-Gemfile: bij RubyGems >= 4 vervangt die core's `commonmarker`-pin door `~> 2.6` (upstream a5ea172). Hier RubyGems 3.5.22, dus niet actief. Verder test/dev-gems (rspec-rails, factory_bot_rails, pry-byebug).
- Overlap met Redmine 7 core: geen (core heeft geen issue- of note-templates).
- Open werk voor ansif:
  1. `settings_controller_spec.rb` aanpassen aan R7-sudo (bv. `Redmine::SudoMode.stubs(:enabled?).returns(false)` of sudo uit via `Redmine::Configuration` in de spec).
  2. Feature specs eenmalig draaien met een chromedriver die bij de Chrome-versie past (niet geverifieerd).

## Branch redmine70-migration
- Basis: origin/master-geoxyz @ 751e719 + merge upstream 87360e7 (--no-ff)
- Commits: 6522c8b Merge upstream agileware-jp/redmine_issue_templates master (87360e7) for Redmine 7 · c496176 Stop defining ActiveRecord::Base.open in the spec helper
- Eindresultaat harness (`results/1006-093656-s1-redmine_issue_templates_redmine70-migration`): boot OK, eager OK, migraties OK, rollback OK, minitest 77 runs / 298 assertions / 0 failures / 0 errors, rspec 149 examples / 45 failures (43 chromedriver-omgeving + 2 sudo-spec), smoke 79/79
- Rollback migraties: OK

