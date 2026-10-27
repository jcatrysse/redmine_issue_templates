import axios from 'axios';

export const CustomFieldPlugin = {
  install(app, options = {}) {
    const {
      baseUrl,
      templateId,
      projectId,
    } = options;
    app.config.globalProperties.getCustomFields = async (trackerId) => {
      const params = {
        tracker_id: trackerId,
        template_id: templateId,
        project_id: projectId,
      };
      const { data } = await axios.get(baseUrl, { params });
      const { custom_fields } = data;
      return custom_fields;
    };
  }
};
