require File.expand_path(File.dirname(__FILE__) + '/../test_helper')
require File.expand_path(File.dirname(__FILE__) + '/../../db/migrate/20230330055341_change_global_note_template_projects_table_name')

# The rename is skipped when the target table is already there (a database that was
# migrated by hand or by an earlier plugin version), so redmine:plugins:migrate does not stop.
class ChangeGlobalNoteTemplateProjectsTableNameTest < ActiveSupport::TestCase
  def setup
    @migration = ChangeGlobalNoteTemplateProjectsTableName.new
    @migration.verbose = false
  end

  def test_up_renames_the_table
    @migration.stubs(:table_exists?).with(:global_note_templates_projects).returns(false)
    @migration.expects(:rename_table).with(:global_note_template_projects, :global_note_templates_projects)
    @migration.up
  end

  def test_up_skips_the_rename_when_the_table_is_already_renamed
    @migration.stubs(:table_exists?).with(:global_note_templates_projects).returns(true)
    @migration.expects(:rename_table).never
    @migration.up
  end

  def test_down_renames_the_table_back
    @migration.stubs(:table_exists?).with(:global_note_template_projects).returns(false)
    @migration.expects(:rename_table).with(:global_note_templates_projects, :global_note_template_projects)
    @migration.down
  end

  def test_down_skips_the_rename_when_the_old_table_exists
    @migration.stubs(:table_exists?).with(:global_note_template_projects).returns(true)
    @migration.expects(:rename_table).never
    @migration.down
  end
end
