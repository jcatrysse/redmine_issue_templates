require File.expand_path(File.dirname(__FILE__) + '/../test_helper')

# Redmine loads plugins/*/Gemfile into its own bundle, in production too, so this
# plugin's Gemfile must keep every gem Redmine declares (only commonmarker is swapped
# on purpose, on RubyGems 4).
class PluginGemfileTest < ActiveSupport::TestCase
  def test_gems_declared_by_redmine_stay_in_the_bundle
    core_gems = File.read(Rails.root.join('Gemfile')).scan(/^gem ['"]([^'"]+)['"]/).flatten
    bundled = Bundler.definition.dependencies.map(&:name)

    assert_includes core_gems, 'nokogiri'
    assert_empty core_gems - bundled
  end
end
