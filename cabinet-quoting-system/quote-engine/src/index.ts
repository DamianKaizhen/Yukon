import 'module-alias/register';
import QuoteEngineApp from './app';
import { Logger } from '@/utils/Logger';
import { config } from '@/config';

// Initialize logger
const logger = Logger.getInstance();

// Log startup information
logger.info('Starting Quote Engine Service', {
  version: '1.0.0',
  node_version: process.version,
  environment: config.getEnvironment(),
  platform: process.platform,
  arch: process.arch
});

// Validate configuration
try {
  logger.info('Configuration loaded successfully', {
    server_port: config.getServerConfig().port,
    api_version: config.getServerConfig().api_version,
    log_level: logger.getLogLevel(),
    pdf_storage: config.getPDFConfig().storage_path,
    backend_url: config.getBackendApiUrl()
  });
} catch (error) {
  logger.error('Configuration validation failed', { error });
  process.exit(1);
}

// Create and start the application
try {
  const app = new QuoteEngineApp();
  app.listen();
} catch (error) {
  logger.error('Failed to start Quote Engine', { error });
  process.exit(1);
}