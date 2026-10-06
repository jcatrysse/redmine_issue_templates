# Redmine 7 migration: redmine_issue_templates

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `redmine_issue_templates` |
| GEOxyz runs today | `master-geoxyz` |
| Upstream | agileware-jp/redmine_issue_templates master @ 87360e7db5f274b3572234c3e1806aeb2772f409 (2026-09-24) |
| Runs on Redmine 7 as is | JA |
| Upstream sync | SYNC AANBEVOLEN: upstream master 87360e7 merged into master-geoxyz (on redmine70-migration): legacy-icons-compat.css only on plugin screens, REST index via api format, CI; no conflicts, GEOxyz's 3 commits intact |
| After sync | JA |
| Complexity (1 trivial .. 5 rewrite) | 1 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `c496176` |

## Already on this branch

- `6522c8b` Merge upstream agileware-jp/redmine_issue_templates master (87360e7) for Redmine 7
- `c496176` Stop defining ActiveRecord::Base.open in the spec helper

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Open items from the analysis** (Dutch; where they repeat a priority item, the priority item wins)

1. settings_controller_spec.rb:28,33 fail on R7: Redmine::SudoMode.disable! in before() is reset per request (CurrentAttributes) and sudo is on by default; adapt the spec
2. Run the selenium feature specs once with a chromedriver matching the Chrome version (not verified here)
3. Plugin Gemfile swaps core's commonmarker pin to ~> 2.6 when RubyGems >= 4 (upstream a5ea172) - be aware if production uses RubyGems 4

**Checks**

4. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
5. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
6. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject |
|---|---|---|
| `751e719` | 2026-01-16 | Rename Gemfile.local to Gemfile (needed for correct handling of gem dependencies) |
| `82f6b59` | 2025-11-24 | Rename Gemfile.local to Gemfile (needed for correct handling of gem dependencies) |
| `fe92817` | 2025-11-24 | DB migration optimization |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- None known. Add here what the session finds.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```
On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow.

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline**: set up Redmine 7.0-stable-GEOxyz and run the plugin's tests on PostgreSQL and
   on MariaDB (see "How to test"). Write the numbers here before you change anything.
3. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
4. **Work list**: then the numbered list, in order. One concern per commit.
5. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
6. **Browser**: start a Redmine 7 with this plugin, exercise every feature as admin and as a
   normal user with and without the plugin's permissions, and save screenshots (before on 5.1 or
   the old branch, after on 7.0) where behaviour or layout matters.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
   settings, cron, files, removed features) goes into the section "After the upgrade".
9. **Finish**: update "Status" and the work list in this file, push `redmine70-migration`, and
   report: what changed, test numbers on both databases, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service;
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint or browser check as passed without having seen it.
  Quote the summary lines. "Should work" is not a result.
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
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module.
  The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why).
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every feature verified by hand on Redmine 7; screenshots listed.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


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

