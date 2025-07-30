import request from 'supertest';
import express from 'express';
import authRoutes from '../../../backend/src/routes/auth';

describe('Authentication API Endpoints', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'SecurePass123!',
      phone: '+1234567890',
      companyName: 'Test Company'
    };

    it('should register a new customer successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', validRegistrationData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const invalidData = { ...validRegistrationData, password: '123' };
      
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('password');
    });

    it('should reject registration with missing required fields', async () => {
      const invalidData = { email: 'test@example.com' };
      
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject registration with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      // Duplicate registration
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    const loginCredentials = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    beforeEach(async () => {
      // Ensure user exists
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: loginCredentials.email,
          password: loginCredentials.password,
          phone: '+1234567890',
          companyName: 'Test Company'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send(loginCredentials)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', loginCredentials.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: loginCredentials.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: loginCredentials.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /auth/refresh', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get token
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'refresh@example.com',
          password: 'SecurePass123!',
          phone: '+1234567890',
          companyName: 'Test Company'
        });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'refresh@example.com',
          password: 'SecurePass123!'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should refresh token with valid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.token).not.toBe(authToken);
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'logout@example.com',
          password: 'SecurePass123!',
          phone: '+1234567890',
          companyName: 'Test Company'
        });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'logout@example.com',
          password: 'SecurePass123!'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});