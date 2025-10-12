import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyJWT } from '../../../middlewares/auth-middleware';
import { Request, Response, NextFunction } from 'express';

describe('JWT Authentication Middleware', () => {
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  
  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    nextFunction = vi.fn();
  });
  
  describe('verifyJWT', () => {
    it('should call next() if valid JWT token is provided', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };
      
      // Mock the verifyToken function to return a valid decoded token
      const mockVerifyToken = vi.fn().mockResolvedValue({ sub: '123' });
      // Import and mock the verifyToken function
      vi.doMock('../../../jwt-auth', () => ({
        verifyToken: mockVerifyToken
      }));
      
      // Act
      await verifyJWT(mockRequest as any, mockResponse as Response, nextFunction);
      
      // Assert
      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.userId).toBe(123);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
    
    it('should return 401 if no token is provided', async () => {
      // Arrange
      mockRequest.headers = {};
      
      // Act
      await verifyJWT(mockRequest as any, mockResponse as Response, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });
    
    it('should return 401 if token verification fails', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };
      
      // Mock verifyToken to throw an error
      const mockVerifyToken = vi.fn().mockRejectedValue(new Error('Invalid token'));
      vi.doMock('../../../jwt-auth', () => ({
        verifyToken: mockVerifyToken
      }));
      
      // Act
      await verifyJWT(mockRequest as any, mockResponse as Response, nextFunction);
      
      // Assert
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });
});