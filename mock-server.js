const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock user database
const users = new Map();
const tokens = new Map();

// Utility functions
function generateToken() {
  return 'mock_token_' + Math.random().toString(36).substr(2, 9);
}

function createUser(email, password, name) {
  const user = {
    id: users.size + 1,
    email,
    name: name || email.split('@')[0],
    profileImageUrl: null,
    createdAt: new Date().toISOString()
  };
  users.set(email, { ...user, password });
  return user;
}

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  console.log('Registration attempt:', req.body);
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (users.has(email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const user = createUser(email, password, name);
  const token = generateToken();
  tokens.set(token, user);

  console.log('User registered successfully:', user.email);
  res.json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const userData = users.get(email);
  if (!userData || userData.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _, ...user } = userData;
  const token = generateToken();
  tokens.set(token, user);

  console.log('User logged in successfully:', user.email);
  res.json({ user, token });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  const user = tokens.get(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  res.json(user);
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    tokens.delete(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock server is running' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock API server running on http://0.0.0.0:${PORT}`);
  console.log(`Available at http://10.10.10.178:${PORT} for mobile devices`);
  console.log('\nAvailable endpoints:');
  console.log('POST /api/auth/register - Register a new user');
  console.log('POST /api/auth/login - Login user');
  console.log('GET /api/auth/me - Get current user');
  console.log('POST /api/auth/logout - Logout user');
});