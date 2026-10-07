require File.expand_path(File.dirname(__FILE__) + '/../test_helper')

class JournalsHookTest < ActiveSupport::TestCase
  fixtures :projects, :users, :roles, :members, :member_roles, :trackers, :projects_trackers,
           :issues, :issue_statuses, :enumerations, :note_templates, :note_visible_roles

  # Without a project in the hook context the project comes from the issue being edited.
  def test_project_of_the_issue_when_the_context_has_no_project
    hook = IssueTemplates::JournalsHook.instance
    issue = Issue.find(1)

    assert_equal [issue.tracker_id, issue.project_id],
                 hook.tracker_project_ids({ project: nil, issue: issue }, issue.tracker_id)
    assert_equal [issue.tracker_id, issue.project_id],
                 hook.tracker_project_ids({ project: nil, journal: Journal.new(journalized: issue) }, issue.tracker_id)
  end
end
