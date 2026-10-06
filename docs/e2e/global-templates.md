# global-templates

Run 2026-10-06T20:06:48.624Z against http://127.0.0.1:3000.

| screenshot | user | URL | shows |
|---|---|---|---|
| ![](global-templates-admin-menu.png) | admin | `/admin` | Administration lists Global Issue Templates (raster icon through legacy-icons-compat on Redmine 7) |
| ![](global-templates-issue-list.png) | admin | `/global_issue_templates` | The global issue templates per tracker |
| ![](global-templates-issue-create-invalid.png) | admin | `/global_issue_templates` | A global template without a name is refused with a validation message |
| ![](global-templates-issue-new.png) | admin | `/global_issue_templates` | The new global template is enabled and assigned to the E2E project |
| ![](global-templates-issue-created.png) | admin | `/global_issue_templates/2` | The global template is saved |
| ![](global-templates-issue-in-project.png) | admin | `/projects/e2e-project/issues/new` | The project's new issue form offers the new global template in its pulldown |
| ![](global-templates-issue-updated.png) | admin | `/global_issue_templates/2` | Editing saves the change; the template is disabled |
| ![](global-templates-issue-deleted.png) | admin | `/global_issue_templates` | The disabled global template is deleted |
| ![](global-templates-note-list.png) | admin | `/global_note_templates` | The global note templates per tracker |
| ![](global-templates-note-created.png) | admin | `/global_note_templates/2` | A global note template is saved |
| ![](global-templates-note-delete-enabled.png) | admin | `/global_note_templates/2` | The Delete link of an enabled global note template is disabled; sending the delete anyway is refused with an error |
| ![](global-templates-manager-refused.png) | manager | `/global_issue_templates` | The global template pages are refused to a non-administrator (403) |
| ![](global-templates-manager-create-refused.png) | manager | `/global_issue_templates` | Creating a global template as a non-administrator is refused (403); this used to succeed |
| ![](global-templates-manager-update-refused.png) | manager | `/global_note_templates/1` | Changing a global note template as a non-administrator is refused (403); this used to succeed |
| ![](global-templates-reporter-refused.png) | reporter | `/global_issue_templates/new` | A reporter is refused too |
| ![](global-templates-unchanged.png) | admin | `/global_note_templates/1` | Afterwards the global templates the manager tried to delete or change are unchanged |
