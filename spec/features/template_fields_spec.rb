# frozen_string_literal: true

require_relative '../spec_helper'
require_relative '../rails_helper'
require_relative '../support/login_helper'

RSpec.configure do |c|
  c.include LoginHelper
end

# The built-in field generator (scripts/template_fields.js, Vue) after the move from Vue 2 to
# Vue 3 (2026-10-27): the page and the markup stay what Vue 2 rendered, and a template's watchers
# are still added on a new issue.
feature 'Template fields generator', js: true do
  fixtures :projects, :users, :roles, :members, :member_roles, :issues, :issue_statuses,
           :trackers, :projects_trackers, :enabled_modules, :enumerations

  given(:role) { Role.find(1) }
  given!(:enabled_module) { FactoryBot.create(:enabled_module) }
  given!(:template) do
    FactoryBot.create(:issue_template, project_id: 1, tracker_id: 1,
                                       title: 'Fields template', description: 'Fields description')
  end

  before do
    Setting.send 'plugin_redmine_issue_templates=', 'enable_builtin_fields' => 'true'
    User.find_by(login: 'jsmith').update(mail: 'jsmith@badge.example.com', password: 'password')
    assign_template_priv(role, add_permission: :show_issue_templates)
    assign_template_priv(role, add_permission: :edit_issue_templates)
    log_user('jsmith', 'password')
  end

  after do
    page.execute_script 'window.close();'
  end

  # Vue 2 replaced #json_generator with the generator, Vue 3 mounts inside its target: the page
  # must still have one #json_generator, without the generator's settings as attributes.
  scenario 'The generator takes the place of #json_generator' do
    visit project_issue_template_path(Project.find('ecookbook'), template)
    expect(page).to have_css('#json_generator #field_selector')
    expect(page.evaluate_script("document.querySelectorAll('[id=json_generator]').length")).to eq 1
    expect(page.evaluate_script("document.getElementById('json_generator').getAttributeNames()")).to eq %w[id style]
  end

  # Redmine styles a multiple select by select[multiple=multiple]; Vue 3 writes multiple="".
  scenario 'A multiple value select keeps multiple="multiple"' do
    visit project_issue_template_path(Project.find('ecookbook'), template)
    select I18n.t(:field_watcher), from: 'field_selector'
    expect(page).to have_css('select#value_selector[multiple="multiple"]')
  end

  # Vue 3 drops the line break Vue 2 kept as a space between an entry and its delete icon.
  scenario 'An entry keeps a space before its delete icon' do
    template.update!(builtin_fields_json: { 'issue_start_date' => '2026-10-27' })
    visit project_issue_template_path(Project.find('ecookbook'), template)
    expect(page).to have_css('#fields_setting_display_area li .icon-del')
    text_before_icon = page.evaluate_script(<<~JS)
      (() => {
        const li = document.querySelector('#fields_setting_display_area li');
        const range = document.createRange();
        range.setStart(li, 0);
        range.setEndBefore(li.querySelector('.icon-del'));
        return range.toString();
      })()
    JS
    expect(text_before_icon).to match(/issue_start_date\s+\z/)
  end

  # The template's watchers are added through Redmine's watchers/append.js, whose JavaScript the
  # plugin runs on the new issue form.
  scenario 'A template adds its watchers on a new issue' do
    template.update!(builtin_fields_json: { 'issue_watcher_user_ids' => ['3'] })
    visit new_project_issue_path(Project.find('ecookbook'))
    select 'Fields template', from: 'issue_template'
    expect(page).to have_field('issue_description', with: /Fields description/)
    expect(page).to have_css('#watchers_inputs input[name="issue[watcher_user_ids][]"][value="3"]:checked',
                             visible: :all)
  end
end
