require File.expand_path('../test_helper', __dir__)
require 'minitest/autorun'

class NoteTemplatesControllerTest < Redmine::ControllerTest
  fixtures :projects, :enabled_modules,
           :users, :roles,
           :members, :member_roles,
           :trackers, :projects_trackers,
           :note_templates, :note_visible_roles,
           :global_note_templates

  def setup
    @request.session[:user_id] = 2  # jsmith
    @request.env['HTTP_REFERER'] = '/'
    # Enabled Template module
    @project = Project.find(1)
    @project.enabled_modules << EnabledModule.new(name: 'issue_templates')
    @project.save!

    # Set default permission: show template
    Role.find(1).add_permission! :show_issue_templates
  end

  def test_index_with_non_existing_project_should_be_not_found
    # set non existing project
    get :index, params: { project_id: 100 }
    assert_response :not_found
  end

  def test_index_without_show_permission_should_be_forbidden
    Role.find(1).remove_permission! :show_issue_templates
    get :index, params: { project_id: 1 }
    assert_response :forbidden
  end

  def test_index_with_normal_should_be_success
    get :index, params: { project_id: 1 }
    assert_response :success
  end

  def test_index_with_admin_logged_in_should_appear_all_note_templates
    @request.session[:user_id] = 1  # admin

    ids = NoteTemplate.reorder(id: :asc).where(project_id: 1).pluck(:id)
    assert_equal [1, 2, 3, 4, 5], ids

    get :index, params: { project_id: 1 }
    assert_response :success

    assert_select 'table.template_list tbody tr.note_template' do
      ids.each do |id|
        assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/#{id}", count: 1
      end
    end
  end

  def test_index_should_appear_note_templates_with_open_visibility
    ids = NoteTemplate.reorder(id: :asc).where(project_id: 1).open.pluck(:id)
    assert_equal [4], ids

    get :index, params: { project_id: 1 }
    assert_response :success

    assert_select 'table.template_list tbody tr.note_template' do
      ids.each do |id|
        assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/#{id}", count: 1
      end
    end
  end

  def test_index_with_author_logged_in_should_appear_note_templates_with_mine_visibility
    user_id = 3 # dlopper
    @request.session[:user_id] = user_id
    Role.find(2).add_permission! :show_issue_templates

    ids = NoteTemplate.reorder(id: :asc).where(project_id: 1).mine_condition(user_id).pluck(:id)
    assert_equal [5], ids

    get :index, params: { project_id: 1 }
    assert_response :success

    assert_select 'table.template_list tbody tr.note_template' do
      ids.each do |id|
        assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/#{id}", count: 1
      end
    end
  end

  def test_index_should_appear_note_templates_with_roles_visibility
    ids = NoteTemplate.reorder(id: :asc).where(project_id: 1).where(visibility: :roles).pluck(:id)
    assert_equal [2, 3], ids

    @request.session[:user_id] = 2  # jsmith
    Role.find(1).add_permission! :show_issue_templates

    get :index, params: { project_id: 1 }
    assert_response :success

    assert_select 'table.template_list tbody tr.note_template' do
      assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/2", count: 1
      assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/3", count: 0
    end

    @request.session[:user_id] = 3  # dlopper
    Role.find(2).add_permission! :show_issue_templates

    get :index, params: { project_id: 1 }
    assert_response :success

    assert_select 'table.template_list tbody tr.note_template' do
      assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/2", count: 1
      assert_select 'td a[href=?]', "/projects/ecookbook/note_templates/3", count: 1
    end
  end

  def test_template_of_another_project_is_not_found_through_this_project
    Role.find(1).add_permission! :edit_issue_templates
    # Project 2 is private; jsmith's role there (Developer) has no template permission.
    template = NoteTemplate.create!(project_id: 2, tracker_id: 1, author_id: 1, name: 'Private note template',
                                    description: 'Secret', visibility: 'open', enabled: false)

    get :show, params: { project_id: 1, id: template.id }
    assert_response :not_found

    put :update, params: { project_id: 1, id: template.id, note_template: { description: 'Changed through project 1' } }
    assert_response :not_found
    assert_equal 'Secret', template.reload.description

    delete :destroy, params: { project_id: 1, id: template.id }
    assert_response :not_found
    assert NoteTemplate.exists?(template.id)
  end

  def test_load_refuses_a_template_of_a_project_without_permission
    # Project 2 is private; jsmith's role there (Developer) has no template permission.
    template = NoteTemplate.create!(project_id: 2, tracker_id: 1, author_id: 1, name: 'Private note template',
                                    description: 'Secret', visibility: 'open', enabled: true)

    post :load, params: { note_template: { note_template_id: template.id } }
    assert_response :not_found
  end

  def test_load_returns_an_open_template_of_a_project_with_permission
    post :load, params: { note_template: { note_template_id: 4 } }
    assert_response :success
    assert_equal 'note template 4', JSON.parse(response.body)['note_template']['name']

    Role.find(1).remove_permission! :show_issue_templates
    post :load, params: { note_template: { note_template_id: 4 } }
    assert_response :not_found
  end

  def test_index_api_lists_note_templates
    @request.session[:user_id] = nil
    @request.headers['X-Redmine-API-Key'] = User.find(2).api_key
    with_settings(rest_api_enabled: '1') { get :index, params: { project_id: 1, format: 'json' } }
    assert_response :success
    template = JSON.parse(response.body)['note_templates'].detect { |t| t['id'] == 4 }
    assert_equal 'note template 4', template['name']
    assert_equal Tracker.find(1).name, template['tracker_name']
  end

  def test_load_global_note_template_requires_it_to_be_offered_in_the_project
    template = GlobalNoteTemplate.find(1) # open, assigned to no project
    params = { note_template: { note_template_id: 1, template_type: 'global', project_id: 1 } }

    post :load, params: params
    assert_response :not_found

    template.projects << Project.find(1)
    post :load, params: params
    assert_response :success
    assert_equal 'global note template 1', JSON.parse(response.body)['note_template']['name']

    Role.find(1).remove_permission! :show_issue_templates
    post :load, params: params
    assert_response :not_found
  end

  def test_new_form_does_not_call_the_template_orphaned
    Role.find(1).add_permission! :edit_issue_templates
    get :new, params: { project_id: 1 }
    assert_response :success
    assert_not_include I18n.t(:orphaned_template), response.body
  end
end
