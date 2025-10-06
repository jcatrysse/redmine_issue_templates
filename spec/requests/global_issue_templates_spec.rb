# frozen_string_literal: true

require_relative '../spec_helper'
require File.expand_path(File.dirname(__FILE__) + '/../support/controller_helper')

RSpec.configure do |c|
  c.include ControllerHelper
end

RSpec.describe 'Global Issue Template', type: :request do
  let(:user) { FactoryBot.create(:user, login: 'test-manager', password: 'password', language: 'en', admin: admin) }
  let(:project) { FactoryBot.create(:project, enabled_module_names: %w[issue_templates]) }

  before do
    FactoryBot.create(:member, roles: [Role.find_by(name: 'Issue templates viewer') || FactoryBot.create(:role, :issue_templates_viewer)], principal: user, project: project)

    ActionController::Base.allow_forgery_protection = false
    login_request(user.login, 'password')
  end

  context '管理者の場合' do
    let(:admin) { true }

    it 'returns ok' do
      get orphaned_templates_global_issue_templates_path

      expect(response).to have_http_status :ok
    end
  end

  context '管理者ではない場合' do
    let(:admin) { false }

    it 'returns forbidden' do
      get orphaned_templates_global_issue_templates_path

      expect(response).to have_http_status :forbidden
    end
  end
end
