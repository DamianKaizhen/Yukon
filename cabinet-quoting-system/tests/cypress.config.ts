import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'utils/cypress-support.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    videosFolder: 'reports/cypress/videos',
    screenshotsFolder: 'reports/cypress/screenshots',
    experimentalStudio: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        }
      })

      // Code coverage setup
      require('@cypress/code-coverage/task')(on, config)
      
      return config
    },
    env: {
      // Test environment configuration
      backend_url: 'http://localhost:3001',
      quote_engine_url: 'http://localhost:3003',
      admin_url: 'http://localhost:3002',
      
      // Test user credentials
      test_user_email: 'cypress@example.com',
      test_user_password: 'CypressTest123!',
      admin_email: 'admin@example.com',
      admin_password: 'AdminTest123!',
      
      // API timeouts
      api_timeout: 10000,
      
      // Feature flags for conditional testing
      enable_performance_tests: true,
      enable_accessibility_tests: true,
      enable_visual_regression: false
    },
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'components/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'utils/cypress-support.ts',
  },

  retries: {
    runMode: 2,
    openMode: 0,
  },

  watchForFileChanges: false,
}