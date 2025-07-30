import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload, User, UserRole } from '@/types';
import config from '@/config';
import { AuthenticationError } from '@/types';

export class AuthHelper {
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  public static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  public static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'cabinet-quoting-system',
      audience: 'cabinet-api'
    });
  }

  public static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'cabinet-quoting-system',
      audience: 'cabinet-api'
    });
  }

  public static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'cabinet-quoting-system',
        audience: 'cabinet-api'
      }) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid access token');
    }
  }

  public static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'cabinet-quoting-system',
        audience: 'cabinet-api'
      }) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  public static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  public static generateTokenPair(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  public static hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.SALES]: 2,
      [UserRole.ADMIN]: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  public static requireRole(userRole: UserRole, requiredRole: UserRole): void {
    if (!this.hasRole(userRole, requiredRole)) {
      throw new AuthenticationError(`Insufficient permissions. Required role: ${requiredRole}`);
    }
  }

  public static generateApiKey(): string {
    return Buffer.from(Date.now().toString() + Math.random().toString()).toString('base64');
  }

  public static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  }
}

export default AuthHelper;