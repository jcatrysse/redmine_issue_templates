# frozen_string_literal: true

require_relative '../spec_helper'

# The specs truncate every table; Redmine's built-in groups must be back for each example,
# or User#roles of the anonymous user fails (seen as HTTP 500 on /login with redmine_stealth).
describe 'Redmine built-in groups in specs' do
  it 'exist in every example' do
    expect(GroupAnonymous.unscoped.count).to eq 1
    expect(GroupNonMember.unscoped.count).to eq 1
    expect { User.anonymous.roles }.not_to raise_error
  end
end
