import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, comparePassword } from '../../../auth';
import bcrypt from 'bcryptjs';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn()
}));

describe('Password Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('hashPassword', () => {
    it('should hash a password with bcrypt', async () => {
      // Arrange
      const password = 'securePassword123';
      const hashedPassword = '$2a$10$ABCDEFGHIJKLMNOPQRSTUV';
      
      (bcrypt.hash as any).mockResolvedValue(hashedPassword);
      
      // Act
      const result = await hashPassword(password);
      
      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, expect.any(Number));
    });
    
    it('should use an appropriate salt round for hashing', async () => {
      // Arrange
      const password = 'securePassword123';
      
      // Act
      await hashPassword(password);
      
      // Assert
      // Check that hash was called with a reasonable salt round (typically between 10-12)
      const saltRound = (bcrypt.hash as any).mock.calls[0][1];
      expect(saltRound).toBeGreaterThanOrEqual(10);
      expect(saltRound).toBeLessThanOrEqual(14);
    });
    
    it('should throw an error if bcrypt fails', async () => {
      // Arrange
      const password = 'securePassword123';
      (bcrypt.hash as any).mockRejectedValue(new Error('Bcrypt error'));
      
      // Act & Assert
      await expect(hashPassword(password)).rejects.toThrow('Bcrypt error');
    });
  });
  
  describe('comparePassword', () => {
    it('should return true if passwords match', async () => {
      // Arrange
      const password = 'securePassword123';
      const hashedPassword = '$2a$10$ABCDEFGHIJKLMNOPQRSTUV';
      
      (bcrypt.compare as any).mockResolvedValue(true);
      
      // Act
      const result = await comparePassword(password, hashedPassword);
      
      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
    
    it('should return false if passwords do not match', async () => {
      // Arrange
      const password = 'incorrectPassword';
      const hashedPassword = '$2a$10$ABCDEFGHIJKLMNOPQRSTUV';
      
      (bcrypt.compare as any).mockResolvedValue(false);
      
      // Act
      const result = await comparePassword(password, hashedPassword);
      
      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
    
    it('should throw an error if bcrypt fails', async () => {
      // Arrange
      const password = 'securePassword123';
      const hashedPassword = '$2a$10$ABCDEFGHIJKLMNOPQRSTUV';
      
      (bcrypt.compare as any).mockRejectedValue(new Error('Bcrypt error'));
      
      // Act & Assert
      await expect(comparePassword(password, hashedPassword)).rejects.toThrow('Bcrypt error');
    });
  });
});