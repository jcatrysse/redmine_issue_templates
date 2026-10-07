require File.expand_path(File.dirname(__FILE__) + '/../test_helper')

class LayoutTest < Redmine::IntegrationTest
  fixtures :projects, :trackers, :issue_statuses, :issues,
           :enumerations, :users,
           :projects_trackers,
           :roles,
           :member_roles,
           :members,
           :enabled_modules,
           :workflows,
           :issue_templates

  def test_issue_template_not_visible_when_module_off
    # module -> disabled
    log_user('admin', 'admin')
    post '/projects/ecookbook/modules',
         params: { enabled_module_names: ['issue_tracking'], commit: 'Save', id: 'ecookbook' }

    get '/projects/ecookbook/issues'
    assert_response :success
    assert_select 'h3', count: 0, text: I18n.t('issue_template')

    get '/projects/ecookbook/issues/new'
    assert_select 'div#template_area select#issue_template', 0
  end

  def test_issue_template_visible_when_module_on
    # module -> enabled
    log_user('admin', 'admin')
    post '/projects/ecookbook/modules',
         params: { enabled_module_names: %w[issue_tracking issue_templates],
                   commit: 'Save', id: 'ecookbook' }

    get '/projects/ecookbook/issues'
    assert_response :success
  end

  # Redmine 7: icons from the SVG sprite, no legacy raster stylesheet (decision of 2026-10-07)
  def test_plugin_screens_use_svg_sprite_icons
    Project.find('ecookbook').enabled_modules.create!(name: 'issue_templates')
    log_user('admin', 'admin')

    get '/admin'
    assert_select '#admin-menu a.icon-global_issue_templates svg.icon-svg use[href*="#icon--issue-note"]'

    get '/global_issue_templates'
    assert_response :success
    assert_select 'link[href*="legacy-icons-compat"]', 0
    assert_select '#content .contextual a.icon-add svg.icon-svg use[href*="#icon--add"]'

    get '/projects/ecookbook/issue_templates'
    assert_response :success
    assert_select 'link[href*="legacy-icons-compat"]', 0
    assert_select 'h3.template_tracker svg.icon-svg use[href*="#icon--issue"]'
    assert_select 'a.icon-template svg.icon-svg use[href*="#icon--list"]'
    assert_select 'a.template_tooltip svg.icon-svg use[href*="#icon--zoom-in"]'

    get '/projects/ecookbook/issues/new'
    assert_response :success
    assert_select 'link[href*="legacy-icons-compat"]', 0
    assert_select '#template_area a#erase_template svg.icon-svg use[href*="#icon--clear-query"]'
    assert_select '#template_area a#revert_template svg.icon-svg use[href*="#icon--reload"]'
    assert_include 'confirmMessage: \'<svg', response.body

    with_settings(plugin_redmine_issue_templates: { 'enable_builtin_fields' => 'true' }) do
      get '/projects/ecookbook/issue_templates/new'
      assert_response :success
      assert_match(/icons: \{"help":"\\u003csvg/, response.body)
    end
  end
end
