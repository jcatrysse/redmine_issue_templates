# Plugin data for the end-to-end scenarios in test/e2e, run by .codex/start_server.sh after the
# generic seed (users admin, manager, reporter, outsider; projects e2e-project, e2e-private).
# Idempotent: running it again changes nothing.
#
#   e2e-project  Bug: "E2E bug report" (default, shared with subprojects), "E2E bug minimal",
#                     "E2E disabled template" (disabled, can be deleted)
#                Feature: "E2E feature request"
#                note templates "E2E open note" (open), "E2E roles note" (role E2E full),
#                "E2E mine note" (only its author, admin)
#                help message on the template pulldown
#   e2e-sub      public subproject of e2e-project that inherits the shared templates
#   e2e-private  Bug: "E2E private template", note template "E2E private note" (open)
#   global       "E2E global template" (Bug) and "E2E global note" (open), both for e2e-project

admin = User.find_by!(login: 'admin')
User.current = admin
project = Project.find_by!(identifier: 'e2e-project')
private_project = Project.find_by!(identifier: 'e2e-private')
bug = Tracker.find_by!(name: 'Bug')
feature = Tracker.find_by!(name: 'Feature')
full = Role.find_by!(name: 'E2E full')

sub = Project.find_by(identifier: 'e2e-sub') ||
      Project.new(identifier: 'e2e-sub', name: 'E2E subproject', description: 'Subproject of the E2E project.')
sub.is_public = true
sub.inherit_members = true
sub.enabled_module_names = project.enabled_module_names
sub.trackers = Tracker.all
sub.save!
sub.set_parent!(project) unless sub.parent_id == project.id

def e2e_issue_template(project, tracker, title, attrs = {})
  IssueTemplate.find_by(project_id: project.id, title: title) ||
    IssueTemplate.create!({ project: project, tracker: tracker, title: title, author: User.current,
                            enabled: true }.merge(attrs))
end

e2e_issue_template(project, bug, 'E2E bug report',
                   issue_title: 'Bug: ', is_default: true, enabled_sharing: true,
                   note: 'Default template for bugs',
                   description: "### Steps to reproduce\n\n1. first step\n2. second step\n\n### Expected result",
                   related_link: 'https://www.redmine.org/projects/redmine/wiki', link_title: 'Bug guidelines')
e2e_issue_template(project, bug, 'E2E bug minimal', issue_title: 'Minimal bug', description: 'What happened?')
e2e_issue_template(project, bug, 'E2E disabled template', enabled: false, description: 'Not offered')
e2e_issue_template(project, feature, 'E2E feature request',
                   issue_title: 'Feature: ', description: "### User story\n\nAs a user I want ...")
e2e_issue_template(private_project, bug, 'E2E private template',
                   issue_title: 'Private', description: 'Confidential text of the private project')

unless GlobalIssueTemplate.exists?(title: 'E2E global template')
  GlobalIssueTemplate.create!(title: 'E2E global template', tracker: bug, author: admin, enabled: true,
                              issue_title: 'Global: ', description: 'Text of the global template',
                              project_ids: [project.id])
end

def e2e_note_template(project, tracker, name, attrs = {})
  NoteTemplate.find_by(project_id: project.id, name: name) ||
    NoteTemplate.create!({ project: project, tracker: tracker, name: name, author: User.current,
                           enabled: true }.merge(attrs))
end

e2e_note_template(project, bug, 'E2E open note', visibility: 'open', description: 'Open note text for everybody')
e2e_note_template(project, bug, 'E2E roles note', visibility: 'roles', role_ids: [full.id],
                                                  description: 'Note text for the E2E full role')
e2e_note_template(project, bug, 'E2E mine note', visibility: 'mine', description: 'Only for its author')
e2e_note_template(private_project, bug, 'E2E private note', visibility: 'open',
                                                           description: 'Confidential note of the private project')

unless GlobalNoteTemplate.exists?(name: 'E2E global note')
  GlobalNoteTemplate.create!(name: 'E2E global note', tracker: bug, author: admin, enabled: true,
                             visibility: 'open', description: 'Global note text', project_ids: [project.id])
end

setting = IssueTemplateSetting.find_or_create(project.id)
setting.update!(enabled: true, help_message: 'E2E help: pick the template that matches your report.')
IssueTemplateSetting.find_or_create(sub.id).update!(inherit_templates: true)

puts "Plugin seed: #{IssueTemplate.count} issue templates, #{NoteTemplate.count} note templates, " \
     "#{GlobalIssueTemplate.count} global issue templates, #{GlobalNoteTemplate.count} global note templates"

# the REST API scenario
Setting.rest_api_enabled = '1'

# ids for the scenarios (they cannot query the database)
ids = {
  api_keys: %w[admin manager reporter outsider].to_h { |login| [login, User.find_by!(login: login).api_key] },
  issue_templates: IssueTemplate.pluck(:title, :id).to_h,
  note_templates: NoteTemplate.pluck(:name, :id).to_h,
  global_issue_templates: GlobalIssueTemplate.pluck(:title, :id).to_h,
  global_note_templates: GlobalNoteTemplate.pluck(:name, :id).to_h,
  projects: Project.where(identifier: %w[e2e-project e2e-private e2e-sub]).pluck(:identifier, :id).to_h,
  trackers: Tracker.pluck(:name, :id).to_h
}
File.write(Rails.root.join('tmp', 'e2e-issue-templates.json'), JSON.pretty_generate(ids))
