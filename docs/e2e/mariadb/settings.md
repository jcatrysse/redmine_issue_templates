# settings

Run 2026-10-06T21:09:30.523Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| settings-plugin-settings.png (not committed, same as ../settings-plugin-settings.png) | admin | `/settings/plugin/redmine_issue_templates` | The plugin settings: global templates for all projects, templates on the edit form, built-in fields |
| settings-plugin-settings-saved.png (not committed, same as ../settings-plugin-settings-saved.png) | admin | `/settings/plugin/redmine_issue_templates` | Saved after confirming the password (sudo mode): built-in fields and templates on the edit form are on |
| settings-builtin-generator.png (not committed, same as ../settings-builtin-generator.png) | manager | `/projects/e2e-project/issue_templates/2` | With built-in fields on, the template form offers the issue's fields and values (from load_selectable_fields) and builds the JSON: Priority = High |
| settings-builtin-applied.png (not committed, same as ../settings-builtin-applied.png) | manager | `/projects/e2e-project/issues/new` | Choosing the template on a new issue also sets Priority to High |
| settings-edit-form-pulldown.png (not committed, same as ../settings-edit-form-pulldown.png) | manager | `/issues/2` | With "apply template when editing" on, the issue edit form has the template pulldown too |
| settings-project-settings.png (not committed, same as ../settings-project-settings.png) | manager | `/projects/e2e-project/issue_templates_settings` | The project's template settings: inherit, replace instead of append, help message |
| settings-project-settings-saved.png (not committed, same as ../settings-project-settings-saved.png) | manager | `/projects/e2e-project/issue_templates_settings` | The project settings are saved |
| settings-replace-confirm.png (not committed, same as ../settings-replace-confirm.png) | manager | `/projects/e2e-project/issues/new` | With "replace" on, choosing a template over typed text asks for confirmation first |
| settings-replaced.png (not committed, same as ../settings-replaced.png) | manager | `/projects/e2e-project/issues/new` | After Yes the subject and description are replaced, not appended |
| settings-inherited.png (not committed, same as ../settings-inherited.png) | manager | `/projects/e2e-sub/issues/new` | In the subproject the parent's shared template is offered as inherited (only the shared one) |
| settings-inherited-list.png (not committed, same as ../settings-inherited-list.png) | manager | `/projects/e2e-sub/issue_templates` | The subproject's template list shows the inherited templates |
| settings-reporter-settings-refused.png (not committed, same as ../settings-reporter-settings-refused.png) | reporter | `/projects/e2e-project/issue_templates_settings` | The project template settings are refused without manage_issue_templates (403) |
| settings-reporter-fields-refused.png (not committed, same as ../settings-reporter-fields-refused.png) | reporter | `/issue_templates/load_selectable_fields?project_id=1&tracker_id=1` | The project's fields, assignable users and watchers for the generator are refused to a reporter (403); they used to be returned to anyone |
