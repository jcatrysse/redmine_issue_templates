// SVG icons of Redmine's sprite, rendered by the server (sprite_icon) and passed in as HTML,
// because the sprite's URL carries an asset digest that only the server knows.
export const IconPlugin = {
  install(app, icons = {}) {
    app.config.globalProperties.icon = (name) => {
      return icons[name] || '';
    };
  }
};
