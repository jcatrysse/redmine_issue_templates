# frozen_string_literal: true

require_relative '../spec_helper'
require File.expand_path(File.dirname(__FILE__) + '/../support/controller_helper')

RSpec.configure do |c|
  c.include ControllerHelper
end

RSpec.describe 'Global Issue Template', type: :request do
  let(:user) { FactoryBot.create(:user, login: 'test-manager', password: 'password', language: 'en') }
  let(:project) { FactoryBot.create(:project, trackers: [FactoryBot.create(:tracker, :with_default_status)], enabled_module_names: %w[issue_templates]) }

  before do
    FactoryBot.create(:member, roles: [role], principal: user, project: project)

    ActionController::Base.allow_forgery_protection = false
    login_request(user.login, 'password')
  end

  describe 'GET /projects/:project_id/issue_templates/orphaned_templates' do
    context 'テンプレートの表示の権限がある場合' do
      let(:role) { Role.find_by(name: 'Issue templates viewer') || FactoryBot.create(:role, :issue_templates_viewer) }

      it 'returns ok' do
        get orphaned_templates_project_issue_templates_path(project)

        expect(response).to have_http_status :ok
      end
    end

    context 'テンプレートの表示の権限がない場合' do
      let(:role) { Role.find_by(name: 'No issue templates permission') || FactoryBot.create(:role, :no_issue_templates_permission) }

      it 'returns forbidden' do
        get orphaned_templates_project_issue_templates_path(project)

        expect(response).to have_http_status :forbidden
      end
    end
  end

  describe 'GET /issue_templates/load_selectable_fields?project_id=&tracker_id=' do
    context 'テンプレートの編集の権限がない場合' do
      let(:role) { Role.find_by(name: 'Issue templates viewer') || FactoryBot.create(:role, :issue_templates_viewer) }

      it 'returns ok' do
        get load_selectable_fields_issue_templates_path(project_id: project.id, tracker_id: project.trackers.first.id)

        expect(response).to have_http_status :ok
      end
    end

    context 'テンプレートの編集の権限がある場合' do
      let(:role) { Role.find_by(name: 'Issue templates editor') || FactoryBot.create(:role, :issue_templates_editor) }

      it 'returns forbidden' do
        get load_selectable_fields_issue_templates_path(project_id: project.id, tracker_id: project.trackers.first.id)

        expect(response).to have_http_status :ok
      end
    end
  end
end
