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

  # The built-in field generator offered a text box for dates: its formats listed 'data'.
  scenario 'The built-in field generator offers a date input for a date field' do
    Setting.send 'plugin_redmine_issue_templates=', 'enable_builtin_fields' => 'true'
    visit project_issue_template_path(Project.find('ecookbook'), template)
    select I18n.t(:field_start_date), from: 'field_selector'
    expect(page).to have_css('#json_generator input#issue_template_json_setting_field[type="date"]')
  end

  # The fields of a template were matched against the tracker it was loaded with; after another
  # tracker was chosen they still said which fields that tracker has.
  scenario 'The built-in fields are checked again against a newly chosen tracker' do
    Setting.send 'plugin_redmine_issue_templates=', 'enable_builtin_fields' => 'true'
    Tracker.find(2).update!(core_fields: Tracker::CORE_FIELDS - %w[start_date])
    template.update!(builtin_fields_json: { 'issue_start_date' => '2026-10-07' })
    visit project_issue_template_path(Project.find('ecookbook'), template)
    expect(page).to have_css('#fields_setting_display_area li', text: "#{I18n.t(:field_start_date)}: 2026-10-07")
    select 'Feature request', from: 'issue_template[tracker_id]'
    expect(page).to have_css('#fields_setting_display_area li',
                             text: I18n.t(:unavailable_fields_for_this_tracker))
    select 'Bug', from: 'issue_template[tracker_id]'
    expect(page).to have_css('#fields_setting_display_area li', text: "#{I18n.t(:field_start_date)}: 2026-10-07")
  end

  # Revert put the text back in the textarea but not in a CKEditor (redmine_ckeditor plugin): it
  # called jQuery's text() on a DOM node and the error was swallowed. CKEditor is stubbed here.
  scenario 'Revert puts the text from before the template back into CKEditor' do
    visit new_project_issue_path(Project.find('ecookbook'))
    fill_in 'issue_subject', with: 'My subject'
    fill_in 'issue_description', with: 'My text'
    page.execute_script(<<~JS)
      window.CKEDITOR = { instances: { issue_description: { data: null, setData(d) { this.data = d; } } } };
    JS
    select 'Fix template', from: 'issue_template'
    expect(page).to have_field('issue_description', with: /Fix description/)
    expect(page.evaluate_script('CKEDITOR.instances.issue_description.data')).to match(/Fix description/)
    find('#revert_template').click
    expect(page).to have_field('issue_description', with: 'My text')
    expect(page.evaluate_script('CKEDITOR.instances.issue_description.data')).to eq 'My text'
  end
end
