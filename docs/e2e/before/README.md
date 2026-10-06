# Before: master-geoxyz (751e719) on Redmine 5.1-stable

The same scenarios as in `docs/e2e`, run against the branch GEOxyz runs today, on Redmine
5.1-stable (Ruby 3.2.6, PostgreSQL 16), production mode, 2026-10-06. The captions in the
`*.md` files describe the behaviour after the migration; here the screenshots show the old
behaviour, and these checks failed, which is the evidence for the fixes on `redmine70-migration`:

| scenario | failed check on the old code | fixed in |
|---|---|---|
| global-templates | a manager (not admin) creates a global issue template, and changes a global note template | 8dacdd6 |
| project-issue-templates | `/projects/e2e-project/issue_templates/<private template>` and `new?copy_from=` answer 200 with the private project's template | 21c76a5 |
| note-templates | `/projects/e2e-project/note_templates/<private note>` answers 200 | 21c76a5 |
| new-issue-template | a reporter without the permission gets the private project's template from `issue_templates/load` (HTTP 200, text shown) | e60784b |
| note-templates | a reporter and a non-member get note templates from `note_templates/load` (HTTP 200), also an "open" one of a private project | e60784b |
| note-templates | a reporter gets the "Template for note" link, which opens an empty popup | 0d9ed53 |
| rest-api | `load.json` answers 200 with confidential text to a reporter, a non-member and anonymous | e60784b |
| rest-api | `issue_templates.json` of a project with inherited templates and `note_templates.json` answer 500 | 376dbf6 |

Layout is otherwise the same on Redmine 5.1 and 7 (raster icons, through legacy-icons-compat on 7).
