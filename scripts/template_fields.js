import { createApp } from 'vue';
import JsonGenerator from './components/JsonGenerator.vue';
import { CustomFieldPlugin } from './plugins/customFields';
import { LocalePlugin } from './plugins/locales';
import { IconPlugin } from './plugins/icons';

const TEMPLATE_FIELDS = function (props) {
  const {
    loadSelectableFieldsPath,
    templateId,
    projectId,
    locales,
    icons,
    builtinFields,
    templateType,
    trackerPulldownId,
  } = props;
  const app = createApp(JsonGenerator, { builtinFields, templateType, trackerPulldownId });
  app.use(LocalePlugin, locales);
  app.use(IconPlugin, icons);
  app.use(CustomFieldPlugin, {
    baseUrl: loadSelectableFieldsPath,
    templateId,
    projectId,
  });

  // Vue 3 mounts inside its target, Vue 2 replaced it: mount on a detached element and put the
  // generator in place of #json_generator, so the page keeps one #json_generator as before.
  const container = document.createElement('div');
  app.mount(container);
  document.getElementById('json_generator').replaceWith(...container.childNodes);
};

window.TEMPLATE_FIELDS = TEMPLATE_FIELDS;
