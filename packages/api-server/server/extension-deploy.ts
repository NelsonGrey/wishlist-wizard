/**
 * Extension Deployment Utilities
 * These functions handle packaging, serving, and tracking analytics for the browser extension
 */

import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { storage } from './storage';

// Firebase-first authenticated request interface
interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}

// Directory where extension files are stored
const EXTENSION_DIR = path.join(process.cwd(), 'client', 'public', 'extension');

// Directory where packaged extensions are stored
const DIST_DIR = path.join(EXTENSION_DIR, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

/**
 * Get browser name from user agent
 */
function getBrowserFromUserAgent(userAgent: string): string {
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Edg/')) return 'edge';
  return 'chrome'; // Default to Chrome for all Chromium-based browsers
}

/**
 * Handle extension download request
 */
export async function downloadExtension(req: AuthenticatedRequest, res: Response) {
  try {
    // Get browser from query param or user agent
    const requestedBrowser = req.query.browser as string || 
                             getBrowserFromUserAgent(req.headers['user-agent'] || '');
    
    // Get version parameter (optional)
    const version = req.query.version as string || 'latest';
    
    // Set default filename based on browser
    let filename = `wishkeeper-extension-${requestedBrowser}.zip`;
    
    // If specific version was requested and exists, use that file
    if (version !== 'latest') {
      filename = `wishkeeper-extension-${requestedBrowser}-v${version}.zip`;
    } else {
      // Otherwise try to find the latest version in the dist directory
      const files = fs.readdirSync(DIST_DIR);
      const browserFiles = files.filter(f => 
        f.startsWith(`wishkeeper-extension-${requestedBrowser}`) && f.endsWith('.zip')
      );
      
      if (browserFiles.length > 0) {
        // Sort by version number to get the latest
        browserFiles.sort((a, b) => {
          const vA = a.match(/v(\d+\.\d+\.\d+)\.zip$/);
          const vB = b.match(/v(\d+\.\d+\.\d+)\.zip$/);
          if (vA && vB) {
            return vB[1].localeCompare(vA[1]);
          }
          return b.localeCompare(a);
        });
        
        filename = browserFiles[0];
      }
    }
    
    const filePath = path.join(DIST_DIR, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // If not, redirect to extension page with error
      return res.redirect('/extension?error=extension-not-found');
    }
    
    // Track download analytics if user is logged in
    if (req.userId) {
      try {
        const userId = req.userId;
        // Record download in analytics (implemented in future)
        console.log(`User ${userId} downloaded ${filename}`);
      } catch (error) {
        console.error('Failed to record extension download:', error);
      }
    }
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving extension download:', error);
    res.status(500).send('Error downloading extension');
  }
}

/**
 * Get extension metadata for browser
 */
export async function getExtensionMetadata(req: Request, res: Response) {
  try {
    const browser = req.query.browser as string || 'chrome';
    
    // Read the manifest.json file
    const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Get the latest version from the file system
    const files = fs.readdirSync(DIST_DIR);
    const browserFiles = files.filter(f => 
      f.startsWith(`wishkeeper-extension-${browser}`) && f.endsWith('.zip')
    );
    
    let latestVersion = manifest.version;
    
    if (browserFiles.length > 0) {
      // Sort by version number to get the latest
      browserFiles.sort((a, b) => {
        const vA = a.match(/v(\d+\.\d+\.\d+)\.zip$/);
        const vB = b.match(/v(\d+\.\d+\.\d+)\.zip$/);
        if (vA && vB) {
          return vB[1].localeCompare(vA[1]);
        }
        return b.localeCompare(a);
      });
      
      const versionMatch = browserFiles[0].match(/v(\d+\.\d+\.\d+)\.zip$/);
      if (versionMatch) {
        latestVersion = versionMatch[1];
      }
    }
    
    // Return metadata
    res.json({
      name: manifest.name,
      version: latestVersion,
      description: manifest.description,
      icons: manifest.icons,
      browser
    });
  } catch (error) {
    console.error('Error getting extension metadata:', error);
    res.status(500).json({ error: 'Failed to get extension metadata' });
  }
}

/**
 * Simple endpoint to trigger extension packaging
 * This would typically be protected and only accessible to admins
 */
export async function packageExtensions(req: AuthenticatedRequest, res: Response) {
  // This would be protected by admin authentication in a real app
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { version } = req.body;
    
    if (!version) {
      return res.status(400).json({ error: 'Version is required' });
    }
    
    // Placeholder for actual packaging logic
    // In a real implementation, this would call the packaging script
    
    // Mock response for now
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Extensions packaged successfully',
        files: [
          `wishkeeper-extension-chrome-v${version}.zip`,
          `wishkeeper-extension-firefox-v${version}.zip`,
          `wishkeeper-extension-edge-v${version}.zip`
        ]
      });
    }, 1500);
  } catch (error) {
    console.error('Error packaging extensions:', error);
    res.status(500).json({ error: 'Failed to package extensions' });
  }
}