const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8082;

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    );
    return;
  }

  // API endpoint for runner status (placeholder)
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        runners: {
          docker: { status: 'unknown', lastCheck: new Date().toISOString() },
          macos: { status: 'unknown', lastCheck: new Date().toISOString() },
        },
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Serve static files
  let filePath = path.join(
    __dirname,
    req.url === '/' ? 'status.html' : req.url
  );

  // Security: only serve files within the monitoring directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }

      // Set content type based on file extension
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      switch (ext) {
        case '.html':
          contentType = 'text/html';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.js':
          contentType = 'application/javascript';
          break;
        case '.json':
          contentType = 'application/json';
          break;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Monitoring server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Dashboard: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
