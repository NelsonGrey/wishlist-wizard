import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken } from '../../../jwt-auth';
import jwt from 'jsonwebtoken';

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn()
}));

describe('JWT Authentication', () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  };
  
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6InRlc3R1c2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });
  
  describe('generateToken', () => {
    it('should generate a JWT token with user information', () => {
      // Arrange
      (jwt.sign as any).mockReturnValue(mockToken);
      
      // Act
      const token = generateToken(mockUser);
      
      // Assert
      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username
        }),
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
    });
    
    it('should include only necessary user information in the token payload', () => {
      // Arrange
      (jwt.sign as any).mockImplementation((payload) => JSON.stringify(payload));
      
      // Act
      const token = generateToken({
        ...mockUser,
        password: 'hashed-password', // Sensitive info that should not be in token
        verificationToken: 'abc123',  // Sensitive info that should not be in token
        // Add other user properties that shouldn't be included
      } as any);
      
      const tokenPayload = JSON.parse(token);
      
      // Assert
      expect(tokenPayload).toHaveProperty('id');
      expect(tokenPayload).toHaveProperty('username');
      expect(tokenPayload).not.toHaveProperty('password');
      expect(tokenPayload).not.toHaveProperty('verificationToken');
    });
    
    it('should set appropriate token expiration time', () => {
      // Arrange
      (jwt.sign as any).mockImplementation((payload, secret, options) => JSON.stringify({ payload, options }));
      
      // Act
      const token = generateToken(mockUser);
      const { options } = JSON.parse(token);
      
      // Assert
      expect(options).toHaveProperty('expiresIn');
      // Typically tokens expire in hours, days, or weeks (e.g., "24h", "7d")
      expect(typeof options.expiresIn).toBe('string');
      expect(options.expiresIn).toMatch(/^\d+[dhms]$/); // e.g., "24h", "7d", "60m"
    });
  });
  
  describe('verifyToken', () => {
    it('should return decoded token payload for valid token', () => {
      // Arrange
      const decodedToken = {
        id: mockUser.id,
        username: mockUser.username,
        iat: 1516239022,
        exp: 9999999999
      };
      
      (jwt.verify as any).mockReturnValue(decodedToken);
      
      // Act
      const result = verifyToken(mockToken);
      
      // Assert
      expect(result).toEqual(decodedToken);
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, process.env.JWT_SECRET);
    });
    
    it('should throw an error for invalid token', () => {
      // Arrange
      const invalidToken = 'invalid-token';
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Act & Assert
      expect(() => verifyToken(invalidToken)).toThrow('Invalid token');
    });
    
    it('should throw an error for expired token', () => {
      // Arrange
      (jwt.verify as any).mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });
      
      // Act & Assert
      expect(() => verifyToken(mockToken)).toThrow(/expired/i);
    });
  });
});