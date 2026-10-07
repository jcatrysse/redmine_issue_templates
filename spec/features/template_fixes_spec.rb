# frozen_string_literal: true

require_relative '../spec_helper'
require_relative '../rails_helper'
require_relative '../support/login_helper'

RSpec.configure do |c|
  c.include LoginHelper
end

# Small bugs of the original plugin fixed on 2026-10-07 (Jan's decision redmine_issue_templates-n2-1).
feature 'Template fixes', js: true do
  fixtures :projects, :users, :roles, :members, :member_roles, :issues, :issue_statuses,
           :trackers, :projects_trackers, :enabled_modules, :enumerations

  given(:role) { Role.find(1) }
  given!(:enabled_module) { FactoryBot.create(:enabled_module) }
  given!(:template) do
    FactoryBot.create(:issue_template, project_id: 1, tracker_id: 1,
                                       title: 'Fix template', description: 'Fix description')
  end

  before do
    User.find_by(login: 'jsmith').update(mail: 'jsmith@badge.example.com', password: 'password')
    assign_template_priv(role, add_permission: :show_issue_templates)
    assign_template_priv(role, add_permission: :edit_issue_templates)
    log_user('jsmith', 'password')
  end

  after do
    page.execute_script 'window.close();'
  end

  # Upstream issue #50: after a validation error the form must keep what was sent, the default
  # template must not be applied on top of it again.
  scenario 'A refused new issue keeps its description without the default template twice' do
    template.update!(is_default: true)
    visit new_project_issue_path(Project.find('ecookbook'))
    expect(page).to have_field('issue_description', with: /Fix description/)
    # without a subject the server refuses the issue and renders the form again
    page.execute_script(<<~JS)
      document.getElementById('issue_subject').value = '';
      document.getElementById('issue_description').value = 'Typed text';
      document.getElementById('issue-form').submit();
    JS
    expect(page).to have_css('#errorExplanation')
    sleep(1)
    expect(page.find('#issue_description').value).to eq 'Typed text'
  end
end
