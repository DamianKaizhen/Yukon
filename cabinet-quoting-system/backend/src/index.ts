import 'module-alias/register';
import App from './app';
import config from './config';
import database from './config/database';
import { UserService } from './services/UserService';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    logger.info('Starting Cabinet Quoting System API Server...');
    
    // Initialize database connection
    await database.connect();
    logger.info('Database connected successfully');
    
    // Create initial admin user if none exists
    const userService = new UserService();
    await userService.createInitialAdmin();
    
    // Create Express app
    const app = new App();
    const server = app.getApp();
    
    // Start server
    server.listen(config.port, () => {
      logger.info(`Server started successfully`, {
        port: config.port,
        environment: config.nodeEnv,
        apiPrefix: config.apiPrefix,
        docsUrl: `http://localhost:${config.port}/docs`,
        healthUrl: `http://localhost:${config.port}${config.apiPrefix}/health`
      });
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await database.disconnect();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await database.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();