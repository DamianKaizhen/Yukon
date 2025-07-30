import { Pool, PoolConfig } from 'pg';
import { DatabaseConfig } from '@/types';
import { logger } from '@/utils/logger';

class DatabaseManager {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'cabinet_system',
      user: process.env.DB_USER || 'cabinet_admin',
      password: process.env.DB_PASSWORD || '',
      schema: process.env.DB_SCHEMA || 'cabinet_system',
      ssl: process.env.NODE_ENV === 'production',
      max_connections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000'),
      connection_timeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
    };
  }

  public async connect(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.max_connections,
      idleTimeoutMillis: this.config.idle_timeout,
      connectionTimeoutMillis: this.config.connection_timeout,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      query_timeout: 30000
    };

    this.pool = new Pool(poolConfig);

    // Set up event handlers
    this.pool.on('connect', (client) => {
      logger.info('New database client connected');
      // Set search path for each connection
      client.query(`SET search_path TO ${this.config.schema}, public`);
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      logger.info('Database connection established successfully', {
        host: this.config.host,
        database: this.config.database,
        schema: this.config.schema,
        current_time: result.rows[0].current_time
      });
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }

    return this.pool;
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection pool closed');
    }
  }

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        query: text,
        duration: `${duration}ms`,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      logger.error('Query execution failed', {
        query: text,
        params,
        error: error instanceof Error ? error.message : error
      });
      throw error;
    }
  }

  public async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return result.rows[0].health_check === 1;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }
}

// Create singleton instance
const database = new DatabaseManager();

export { database };
export default database;