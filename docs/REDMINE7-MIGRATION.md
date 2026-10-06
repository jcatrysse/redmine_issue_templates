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
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
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
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
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
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
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
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
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

No mail, cron, macro or webhook in this plugin.

### Together with other GEOxyz plugins

Redmine 7.0-stable-GEOxyz on PostgreSQL with redmine_issue_field_visibility, redmine_depending_custom_fields, redmine_view_issue_description and redmine_custom_workflows (all `redmine70-migration`, 2026-10-06): this plugin's scenarios for global templates, the new issue form, project templates, REST API and settings passed (0 problems). Finding for **redmine_view_issue_description**: its permission makes `issues#show` answer 403 to members whose role lacks it (core Reporter role, Redmine's test fixtures), so the generic core flow (reporter on /issues/1), this plugin's note template scenario at the reporter step, 2 minitests and 9 update_issue feature specs that open an issue as such a user fail in that combination. That is the other plugin's intended behaviour, not a fault here; worth a look in that plugin's migration (its interplay with roles that only have view_issues).

### Review

- Own adversarial review of the whole diff: found the open global template load (fixed cb732a1) and, through the e2e run, the escaped URL (f77fa86).
- OpenAI review (gpt-5) on 6522c8b..HEAD, 3 rounds, docs/reviews/openai-2026-10-06-*.md: round 1 one finding fixed (7cd3445), one declined (premise wrong, Redmine's Project.find resolves identifiers; it did expose a weaker lookup of mine, replaced); round 2 one declined (Gemfile test, both core Gemfiles checked); round 3 two declined (both premises checked in code and on the running server). Every finding has a Resolution line.

### Open items (not done, with reason)

- `spec/features/drag_and_drop_spec.rb:24` (issue templates) is intermittent in this container: in failing runs no mousedown reaches the page at all (a capture listener on document saw nothing, while elementFromPoint is the sort handle; in passing runs mousedown, sortstart and sortupdate fire). Fails on the code before any change of this branch too, on 7.0 and 5.1; the final runs on PostgreSQL, MariaDB and 5.1 passed. Test left unchanged; looks like chromedriver input timing, not the plugin.
- Not changed, noted: `_list_templates.api.rsb` returns the tracker id under `tracker_name` for the first group; a new note/issue template form shows "Orphaned template from tracker" next to an empty tracker select until one is chosen; `apply_global_template_to_all_projects` only tested as a setting plus the load rule (templates hide global ones when the project has its own, upstream behaviour).
- Kit issues met: `.codex/test_setup.sh` runs `$SUDO -u postgres` with an empty `$SUDO` as root (role created by hand, then `RMP_PROVISION_DB=0`); rsync was missing; a server from another `REDMINE_DIR` on port 3000 makes `start_server.sh` report success while the old server keeps answering.

### Open questions for Jan

1. **Behaviour changes from the security fixes.** All of them remove access that was never meant to exist (non-admin writes on global templates, other projects' templates by id, template text for users without the permission). Options: (a) keep as built (recommended); (b) also offer them upstream to agileware-jp as a PR, since every Redmine installation with this plugin has the same holes (recommended, Jan's call because it publishes the findings).
2. **REST note_templates.json** now returns `name` instead of `title` (the endpoint always answered 500 before, so no client can depend on it). Options: keep `name` (recommended, it is the model's field) or emit both.
3. **Raster icons.** Kept upstream's approach (legacy-icons-compat.css on the plugin's screens) instead of converting every view to `sprite_icon`, which would drop Redmine 5.1 support and is a large view rewrite. Recommended: keep until GEOxyz leaves 5.1, then convert.

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

