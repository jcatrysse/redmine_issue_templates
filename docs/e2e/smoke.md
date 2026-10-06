# smoke

Run 2026-10-06T20:06:19.639Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](smoke-01.png) | admin | `/` | / (HTTP 200) |
| ![](smoke-02.png) | admin | `/projects/e2e-project` | /projects/e2e-project (HTTP 200) |
| ![](smoke-03.png) | admin | `/projects/e2e-project/issues` | /projects/e2e-project/issues (HTTP 200) |
| ![](smoke-04.png) | admin | `/issues/1` | /issues/1 (HTTP 200) |
| ![](smoke-05.png) | admin | `/projects/e2e-project/issues/new` | /projects/e2e-project/issues/new (HTTP 200) |
| ![](smoke-06.png) | admin | `/projects/e2e-project/settings` | /projects/e2e-project/settings (HTTP 200) |
| ![](smoke-07.png) | admin | `/my/page` | /my/page (HTTP 200) |
| ![](smoke-08.png) | admin | `/my/account` | /my/account (HTTP 200) |
| ![](smoke-09.png) | admin | `/admin` | /admin (HTTP 200) |
| ![](smoke-10.png) | admin | `/admin/plugins` | /admin/plugins (HTTP 200) |
| ![](smoke-11.png) | admin | `/settings/plugin/redmine_issue_templates` | /settings/plugin/redmine_issue_templates (HTTP 200) |
| ![](smoke-12.png) | admin | `/global_issue_templates/orphaned_templates` | /global_issue_templates/orphaned_templates (HTTP 200) |
| ![](smoke-13.png) | admin | `/global_issue_templates` | /global_issue_templates (HTTP 200) |
| ![](smoke-14.png) | admin | `/global_issue_templates/new` | /global_issue_templates/new (HTTP 200) |
| ![](smoke-15.png) | admin | `/global_issue_templates/1` | /global_issue_templates/1 (HTTP 200) |
| ![](smoke-16.png) | admin | `/projects/e2e-project/issue_templates/list_templates` | /projects/e2e-project/issue_templates/list_templates (HTTP 404) |
| ![](smoke-17.png) | admin | `/projects/e2e-project/issue_templates/orphaned_templates` | /projects/e2e-project/issue_templates/orphaned_templates (HTTP 200) |
| ![](smoke-18.png) | admin | `/projects/e2e-project/issue_templates` | /projects/e2e-project/issue_templates (HTTP 200) |
| ![](smoke-19.png) | admin | `/projects/e2e-project/issue_templates/new` | /projects/e2e-project/issue_templates/new (HTTP 200) |
| ![](smoke-20.png) | admin | `/projects/e2e-project/issue_templates/1` | /projects/e2e-project/issue_templates/1 (HTTP 200) |
| ![](smoke-21.png) | admin | `/projects/e2e-project/issue_templates_settings/1/edit` | /projects/e2e-project/issue_templates_settings/1/edit (HTTP 406) |
| ![](smoke-22.png) | admin | `/projects/e2e-project/issue_templates_settings` | /projects/e2e-project/issue_templates_settings (HTTP 200) |
| ![](smoke-23.png) | admin | `/projects/e2e-project/note_templates` | /projects/e2e-project/note_templates (HTTP 200) |
| ![](smoke-24.png) | admin | `/projects/e2e-project/note_templates/new` | /projects/e2e-project/note_templates/new (HTTP 200) |
| ![](smoke-25.png) | admin | `/projects/e2e-project/note_templates/1` | /projects/e2e-project/note_templates/1 (HTTP 200) |
| ![](smoke-26.png) | admin | `/issue_templates/load_selectable_fields` | /issue_templates/load_selectable_fields (HTTP 406) |
| ![](smoke-27.png) | admin | `/note_templates/list_templates` | /note_templates/list_templates (HTTP 404) |
| ![](smoke-28.png) | admin | `/global_note_templates` | /global_note_templates (HTTP 200) |
| ![](smoke-29.png) | admin | `/global_note_templates/new` | /global_note_templates/new (HTTP 200) |
| ![](smoke-30.png) | admin | `/global_note_templates/1` | /global_note_templates/1 (HTTP 200) |
