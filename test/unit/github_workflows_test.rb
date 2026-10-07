require File.expand_path(File.dirname(__FILE__) + '/../test_helper')

# GEOxyz runs GitHub Actions by hand only (decision of 2026-10-07): no push, pull_request,
# issues or schedule triggers.
class GithubWorkflowsTest < ActiveSupport::TestCase
  def test_workflows_are_manual_only
    files = Dir[File.expand_path('../../.github/workflows/*.{yml,yaml}', __dir__)]
    assert files.any?

    files.each do |file|
      workflow = YAML.safe_load_file(file)
      triggers = workflow['on'] || workflow[true] # YAML 1.1 reads a bare 'on' as true
      triggers = Array(triggers.is_a?(Hash) ? triggers.keys : triggers).map(&:to_s)
      assert_equal ['workflow_dispatch'], triggers, File.basename(file)
    end
  end
end
