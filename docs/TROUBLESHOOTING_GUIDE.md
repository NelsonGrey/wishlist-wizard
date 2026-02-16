# Wishlist Wizard - Troubleshooting & Common Issues

**Version**: 1.0  
**Last Updated**: February 16, 2026  
**Owner**: Mark Nelson

---

## 📋 Overview

This guide provides solutions for common issues encountered during development, testing, and deployment of Wishlist Wizard.

---

## 🔧 Development Issues

### Issue: Dependencies not installing

**Symptom**: `npm install` fails or hangs

**Solutions**:

1. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and lock file**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check Node version**:
   ```bash
   node --version  # Should be 20.0.0+
   npm --version   # Should be 9.0.0+
   ```

4. **Check internet connection**:
   ```bash
   npm config get registry
   # Should output: https://registry.npmjs.org/
   ```

5. **Try alternative registry**:
   ```bash
   npm config set registry https://registry.npmjs.org/
   npm install
   ```

---

### Issue: Port 3000 or 3001 already in use

**Symptom**: Error like "EADDRINUSE: address already in use :::3000"

**Solutions**:

1. **Find and kill process using port**:
   ```bash
   # macOS/Linux
   lsof -i :3000
   kill -9 <PID>

   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. **Use different port**:
   ```bash
   PORT=3002 npm run dev
   ```

3. **Restart Docker containers** (if using Docker):
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

### Issue: Environment variables not loading

**Symptom**: API calls fail with undefined endpoints, Firebase auth fails

**Solutions**:

1. **Check .env.local exists**:
   ```bash
   ls -la .env.local
   ```

2. **Verify env var syntax**:
   ```
   # ✅ Correct
   VITE_FIREBASE_API_KEY=your_dev_key
   VITE_FIREBASE_PROJECT_ID=wishlist-wizard-dev

   # ❌ Wrong - spaces around =
   VITE_FIREBASE_API_KEY = your_dev_key
   ```

3. **Restart dev server**:
   ```bash
   # Kill current process
   Ctrl+C

   # Start again
   npm run dev
   ```

4. **Check for conflicting env files**:
   ```bash
   # Should only have .env.local
   ls .env*
   ```

---

### Issue: TypeScript errors persist after code fix

**Symptom**: Error shown but code looks correct, or error disappears after restart

**Solutions**:

1. **Restart TypeScript server**:
   - VS Code: Command Palette → "TypeScript: Restart TS Server"
   - Or: Close and reopen VS Code

2. **Check import paths**:
   ```typescript
   // ❌ Wrong
   import { Wishlist } from '../types'

   // ✅ Correct - should end with filename
   import { Wishlist } from '../types/wishlist'
   import type { Wishlist } from '@/types'
   ```

3. **Verify tsconfig.json paths**:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

---

### Issue: Tailwind CSS styles not appearing

**Symptom**: Classes like `bg-blue-500` don't apply styling

**Solutions**:

1. **Check tailwind.config.ts content paths**:
    ```typescript
    export default {
       content: [
          './client-src/**/*.{js,ts,jsx,tsx}',
       ],
    };
    ```

2. **Rebuild CSS**:
   ```bash
   npm run build
   npm run dev
   ```

3. **Check @tailwind directives in CSS**:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

4. **Clear Tailwind cache**:
   ```bash
   rm -rf node_modules/.cache
   npm run dev
   ```

---

### Issue: Tests failing with "Cannot find module"

**Symptom**: Tests fail with module resolution errors

**Solutions**:

1. **Check vitest.config.ts resolve alias**:
   ```typescript
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   }
   ```

2. **Verify moduleNameMapper in vitest config**:
   ```typescript
   test: {
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
   }
   ```

3. **Check import paths in tests use @/ alias**:
   ```typescript
   // ✅ Correct
   import { useWishlists } from '@/hooks/useWishlists';

   // ❌ Wrong
   import { useWishlists } from '../hooks/useWishlists';
   ```

---

### Issue: Database connection errors (legacy SQL only)

**Symptom**: "Unable to connect to database" errors

**Solutions**:

1. **Check PostgreSQL is running**:
   ```bash
   # macOS
   brew services list | grep postgres

   # Linux
   systemctl status postgresql

   # Docker
   docker ps | grep postgres
   ```

2. **Verify DATABASE_URL**:
   ```bash
   # Should be in .env.local
   DATABASE_URL=postgresql://username:password@localhost:5432/wishlist_wizard_dev
   ```

3. **Test connection**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. **Create database if missing**:
   ```bash
   npm run db:setup
   # or
   createdb wishlist_wizard_dev
   ```

5. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

---

## 🧪 Testing Issues

### Issue: Tests timeout

**Symptom**: "Test timeout exceeded" or test hangs indefinitely

**Solutions**:

1. **Increase timeout for specific test**:
   ```typescript
   it('should complete async operation', async () => {
     // test
   }, 10000);  // 10 second timeout
   ```

2. **Check for unresolved promises**:
   ```typescript
   // ❌ Wrong - Promise not awaited
   it('should fetch data', () => {
     fetchData();
     expect(data).toBeDefined();
   });

   // ✅ Correct - Promise awaited
   it('should fetch data', async () => {
     await fetchData();
     expect(data).toBeDefined();
   });
   ```

3. **Check for infinite loops**:
   ```typescript
   // ❌ Wrong - Wrong dependency array
    useEffect(() => {
       loadData();
    }, [loadData]);  // loadData is not stable

   // ✅ Correct
    useEffect(() => {
       loadData();
    }, []);  // Empty array = run once
   ```

4. **Mock timers if using setTimeout**:
   ```typescript
   import { vi } from 'vitest';

   beforeEach(() => {
     vi.useFakeTimers();
   });

   afterEach(() => {
     vi.useRealTimers();
   });

   it('should handle timeout', () => {
     setTimeout(() => {
       // callback
     }, 1000);

     vi.advanceTimersByTime(1000);
     // Assert callback was called
   });
   ```

---

### Issue: Test database state affects other tests

**Symptom**: Tests pass individually but fail when run together

**Solutions**:

1. **Clean up between tests**:
   ```typescript
   afterEach(async () => {
     await db.wishlists.deleteMany({});
     await db.users.deleteMany({});
   });
   ```

2. **Use isolated databases**:
   ```typescript
   beforeAll(async () => {
     // Create isolated test database
     await setupTestDatabase();
   });

   afterAll(async () => {
     // Clean up test database
     await teardownTestDatabase();
   });
   ```

3. **Run tests in isolation**:
   ```bash
   npm run test -- --testPathPattern=wishlistService
   ```

---

### Issue: Mock not working as expected

**Symptom**: Mocked function not being called or returning wrong value

**Solutions**:

1. **Verify mock is defined before use**:
   ```typescript
   const mockFn = vi.fn();
   mockFn.mockResolvedValueOnce({ id: '123' });

   // Make sure mockFn is used in code being tested
   ```

2. **Check mock call arguments**:
   ```typescript
   mockFn('arg1', { id: '123' });

   // Verify exact arguments
   expect(mockFn).toHaveBeenCalledWith('arg1', { id: '123' });

   // Or check what was actually called
   console.log(mockFn.mock.calls);
   ```

3. **Restore mocks after tests**:
   ```typescript
   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

---

## 🌐 Frontend Issues

### Issue: CORS errors (only if using HTTP endpoints)

**Symptom**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:

1. **Check API_URL in .env.local**:
   ```
   VITE_API_URL=http://localhost:5173
   ```

2. **Verify backend CORS configuration**:
   ```typescript
   const corsOptions = {
     origin: 'http://localhost:3000',
     credentials: true,
   };
   app.use(cors(corsOptions));
   ```

3. **Check for credentials in requests**:
    ```typescript
    // ✅ Correct - Include credentials only when required
    const response = await fetch(url, {
       credentials: 'include'
    });
    ```

4. **Proxy in development**:
   ```typescript
   // vite.config.ts
   server: {
     proxy: {
       '/api': 'http://localhost:3001'
     }
   }
   ```

---

### Issue: Authentication token expired

**Symptom**: Firebase calls fail with `unauthenticated`

**Solutions**:

1. **Confirm user is signed in**:
   ```typescript
   import { getAuth } from 'firebase/auth';

   const auth = getAuth();
   console.log(auth.currentUser);
   ```

2. **Force-refresh ID token**:
   ```typescript
   const user = auth.currentUser;
   if (user) {
     await user.getIdToken(true);
   }
   ```

3. **Check Firebase Auth initialization**:
   - Ensure Firebase config is loaded from `VITE_FIREBASE_*` env vars
   - Verify the Firebase project matches the environment

---

### Issue: Images not loading

**Symptom**: Broken image icons instead of product images

**Solutions**:

1. **Check image URLs**:
   ```typescript
   console.log(imageUrl);  // Verify it's a valid URL
   ```

2. **Verify CORS headers** for image URLs:
   ```
   Access-Control-Allow-Origin: *
   ```

3. **Use image loader**:
   ```typescript
   <img
     src={imageUrl}
     alt="Product"
     onError={(e) => {
       e.currentTarget.src = '/placeholder.jpg';
     }}
   />
   ```

4. **Compress images**:
   ```bash
   npm install --save-dev sharp
   npm run optimize-images
   ```

---

## 🔌 API Issues

### Issue: API returns 500 Internal Server Error

**Symptom**: "Internal Server Error" response for valid requests

**Solutions**:

1. **Check Firebase Functions logs**:
   ```bash
   npm run logs --workspace=functions
   ```

2. **Check database connection**:
   ```bash
   npm run db:check-connection
   ```

3. **Verify environment variables** on server:
   ```bash
   echo $FIREBASE_ADMIN_SDK_PATH
   ```

4. **Check for syntax errors**:
   ```bash
   npm run lint
   npm run check
   ```

5. **Check API logs for stack trace**:
   ```javascript
   // In error handler
   console.error('Full error:', error);
   console.error('Stack:', error.stack);
   ```

---

### Issue: Rate limiting errors (429)

**Symptom**: "Too many requests" responses

**Solutions**:

1. **Check for callable throttling**:
   - Ensure the client backs off on retries
   - Verify emulator/production quotas in Firebase Console

2. **Implement exponential backoff**:
   ```typescript
   async function fetchWithRetry(url: string, maxRetries = 3) {
     let lastError;
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetch(url);
       } catch (error) {
         lastError = error;
         await delay(Math.pow(2, i) * 1000);  // 1s, 2s, 4s
       }
     }
     throw lastError;
   }
   ```

3. **Batch requests**:
    ```typescript
    // ❌ Wrong - Too many calls in a loop
    for (const id of wishlistIds) {
       await getWishlistById({ wishlistId: id });
    }

    // ✅ Better - Use Firestore query or aggregate on server
    await getUserWishlists({});
    ```

---

## 🚀 Deployment Issues

### Issue: Deployment fails with "Permission denied"

**Symptom**: Deployment script exits with permission error

**Solutions**:

1. **Make script executable**:
   ```bash
   chmod +x scripts/deploy.sh
   ```

2. **Check git credentials**:
   ```bash
   git config user.email
   git config user.name
   ```

3. **Verify SSH keys** (if using SSH):
   ```bash
   ssh -T git@github.com
   ```

4. **Check Firebase credentials**:
   ```bash
   firebase login:list
   firebase login
   ```

---

### Issue: Build fails on CI/CD pipeline

**Symptom**: "Build failed" in GitHub Actions

**Solutions**:

1. **Check build logs** in GitHub Actions
2. **Run build locally** to reproduce:
   ```bash
   npm run build
   ```

3. **Check Node version** matches CI:
   ```yaml
   - uses: actions/setup-node@v3
     with:
       node-version: '20'
   ```

4. **Check environment variables** available in CI:
   ```yaml
   env:
   VITE_API_URL: ${{ secrets.VITE_API_URL }}
   ```

5. **Check dependencies are locked**:
   ```bash
   git status package-lock.json
   # Should be committed to repository
   ```

---

### Issue: Deployed app returns 404

**Symptom**: "Not Found" error on deployed URL

**Solutions**:

1. **Check deployment status**:
   ```bash
   firebase hosting:sites:list
   firebase hosting:list
   ```

2. **Verify build output exists**:
   ```bash
   ls -la dist/
   ```

3. **Check firebase.json configuration**:
   ```json
   {
     "hosting": {
      "public": "dist",
       "rewrites": [{
         "source": "**",
         "destination": "/index.html"
       }]
     }
   }
   ```

4. **Clear cache**:
   ```bash
   firebase hosting:channels:delete preview-channel
   npm run deploy
   ```

---

## 📱 Mobile Issues

### Issue: Flutter build fails

**Symptom**: "Build failed" when running `flutter build`

**Solutions**:

1. **Check Flutter SDK**:
   ```bash
   flutter doctor
   ```

2. **Clean build artifacts**:
   ```bash
   flutter clean
   flutter pub get
   flutter build ios
   ```

3. **Update dependencies**:
   ```bash
   flutter pub upgrade
   ```

4. **Check iOS deployment target**:
   ```yaml
   # ios/Podfile
   platform :ios, '13.0'
   ```

---

### Issue: App crashes on startup

**Symptom**: App immediately crashes after launch

**Solutions**:

1. **Check logs**:
   ```bash
   flutter run -v
   ```

2. **Check Firebase initialization**:
   ```dart
   await Firebase.initializeApp(
     options: DefaultFirebaseOptions.currentPlatform,
   );
   ```

3. **Check permissions**:
   ```yaml
   # android/app/src/main/AndroidManifest.xml
   <uses-permission android:name="android.permission.INTERNET" />
   ```

---

## 🐛 Common Error Messages

### "Cannot read property 'x' of undefined"

**Cause**: Accessing property on null/undefined object

**Fix**:
```typescript
// ✅ Safe access
if (object?.property) {
  use(object.property);
}

// Or
const value = object?.property ?? 'default';
```

---

### "Module not found"

**Cause**: Import path incorrect or file doesn't exist

**Fix**:
```bash
# Check file exists
ls src/path/to/file.ts

# Fix import path
import { Component } from '@/components/Component';
```

---

### "Firebase: Error (auth/invalid-api-key)"

**Cause**: Invalid or missing Firebase API key

**Fix**:
1. Verify `VITE_FIREBASE_API_KEY` in .env.local
2. Check key in Firebase Console Project Settings
3. Regenerate key if corrupted

---

## 📞 Getting Help

### Resources

- **Documentation**: See [System Architecture](SYSTEM_ARCHITECTURE.md)
- **API Reference**: See [API_REFERENCE.md](API_REFERENCE.md)
- **Code Standards**: See [CODE_STANDARDS.md](CODE_STANDARDS.md)
- **GitHub Issues**: Search existing issues on repository
- **GitHub Discussions**: Ask in discussions forum

### When All Else Fails

1. **Search existing issues**:
   ```
   site:github.com/mnelson3/wishlist-wizard
   ```

2. **Create new issue** with:
   - Clear description of problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, Node version, etc.)
   - Error logs/screenshots

3. **Ask in Slack** #engineering channel with:
   - What you're trying to do
   - What you've already tried
   - Error messages/logs

---

## 📚 Related Documentation

- [Development Setup](ENVIRONMENT_SETUP.md)
- [Code Standards](CODE_STANDARDS.md)
- [Testing Strategy](TESTING_STRATEGY.md)

