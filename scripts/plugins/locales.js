export const LocalePlugin = {
  install(app, locale) {
    app.config.globalProperties.l = (key) => {
      return locale[key];
    };
  }
};
