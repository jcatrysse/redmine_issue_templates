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
end
