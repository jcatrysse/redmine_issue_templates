class ChangeGlobalNoteTemplateProjectsTableName < ActiveRecord::Migration[5.2]
  def up
    unless table_exists?(:global_note_templates_projects)
      rename_table :global_note_template_projects, :global_note_templates_projects
    end
  end

  def down
    unless table_exists?(:global_note_template_projects)
      rename_table :global_note_templates_projects, :global_note_template_projects
    end
  end
end
