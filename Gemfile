group :test do
  gem 'simplecov-rcov', require: false
  gem 'rspec-rails' unless dependencies.any? { |d| d.name == 'rspec-rails' }
  if RUBY_VERSION < '3.0'
    # factory_bot 6.4.5以上はRuby3.0が必要なため、それ以下のバージョンでは6.4.5未満にする
    # https://github.com/thoughtbot/factory_bot/releases/tag/v6.4.5
    gem 'factory_bot', '<6.4.5'
  end
  gem 'factory_bot_rails' unless dependencies.any? { |d| d.name == 'factory_bot_rails' }
  gem 'launchy'
  gem 'database_cleaner'
end

# for Debug
group :development, :test do
  gem 'pry-rails'
  gem 'pry-byebug'
end
