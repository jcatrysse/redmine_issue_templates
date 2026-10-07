require File.expand_path('../test_helper', __dir__)
require 'minitest/autorun'

class GlobalNoteTemplatesControllerTest < Redmine::ControllerTest
  fixtures :projects, :users, :roles, :trackers,
           :global_note_templates

  def setup
    @request.session[:user_id] = 2 # jsmith, not an administrator
    @request.env['HTTP_REFERER'] = '/'
  end

  def test_non_admin_cannot_create_update_or_destroy_templates
    template = GlobalNoteTemplate.find(1)
    template.update_columns(enabled: false, description: 'Global note one')

    assert_no_difference 'GlobalNoteTemplate.count' do
      post :create, params: { global_note_template: { name: 'Created by jsmith', description: 'Created by jsmith',
                                                      tracker_id: 1, enabled: 1,
                                                      visibility: 'open' } }
    end
    assert_response 403

    put :update, params: { id: 1, global_note_template: { description: 'Changed by jsmith' } }
    assert_response 403
    assert_equal 'Global note one', template.reload.description

    delete :destroy, params: { id: 1 }
    assert_response 403
    assert GlobalNoteTemplate.exists?(1)
  end

  def test_admin_can_destroy_a_disabled_template
    @request.session[:user_id] = 1
    GlobalNoteTemplate.find(1).update_column(:enabled, false)

    delete :destroy, params: { id: 1 }
    assert_redirected_to controller: 'global_note_templates', action: 'index'
    assert_not GlobalNoteTemplate.exists?(1)
  end

  # The delete link's title is what the page script shows (and why it stops the click) for an
  # enabled template.
  def test_show_explains_on_the_delete_link_that_only_disabled_templates_can_be_deleted
    @request.session[:user_id] = 1
    get :show, params: { id: 1 }
    assert_response :success
    assert_select 'a.icon-del.template-disabled-link[disabled][title=?]', I18n.t(:enabled_template_cannot_destroy)
  end
end
