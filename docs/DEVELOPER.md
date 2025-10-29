1//01TUQ4hMG2uxUCgYIARAAGAESNwF-L9IreJTDLMjQbt462Q0pjMcRXElmc0PJd-plm8QWDOu1KY7EPqq9AdH7uub09FikoYYs-Iw

# WishKeeper Developer Guide

This document provides technical information for developers working on the WishKeeper platform.

## Tech Stack Overview

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query)
- **UI Components**: Custom components based on Radix UI primitives with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Date Management**: date-fns
- **Calendar**: react-big-calendar
- **Icons**: Lucide React, React Icons

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT and session-based with Passport.js
- **File Storage**: Server-side file system
- **Email**: SendGrid
- **AI Integration**: OpenAI API

### Other Tools
- **Build System**: Vite
- **Package Management**: npm
- **Development Environment**: VS Code
- **Cloud Platform**: Firebase (Hosting, Firestore)
- **Analytics**: Google Analytics
- **External APIs**: Various e-commerce APIs, calendar providers

## Project Structure

```
/ (root)
├── client/                    # Frontend codebase
│   ├── public/                # Public assets and browser extension files
│   │   └── extension/         # Browser extension source code
│   └── src/                   # React application source
│       ├── assets/            # Static assets for the frontend
│       ├── components/        # Reusable UI components
│       │   ├── ar-visualization/  # AR components
│       │   ├── calendar/      # Calendar components
│       │   └── ui/            # General UI components
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility functions and libraries
│       ├── pages/             # Page components
│       └── test/              # Frontend tests
├── mobile/                    # Mobile app source (for future development)
├── server/                    # Backend codebase
│   ├── middlewares/           # Express middlewares
│   ├── routes/                # API route definitions
│   │   ├── calendar.ts        # Calendar API endpoints
│   │   └── ecommerce.ts       # E-commerce API endpoints
│   ├── services/              # Service layer implementations
│   │   ├── calendarIntegrationService.ts  # Calendar integration
│   │   ├── ecommerceIntegrationService.ts # E-commerce platform integration
│   │   ├── emailService.ts    # Email notifications
│   │   └── notificationService.ts # In-app notifications
│   └── tests/                 # Backend tests
└── shared/                    # Shared code between front and backend
    ├── schema.ts              # Database schema definitions
    └── tests/                 # Shared tests
```

## Database Schema

The database schema is defined in `shared/schema.ts` using Drizzle ORM. Key tables include:

- **users**: User accounts and authentication
- **beneficiaries**: People for whom wishlists are created
- **wishlists**: Collections of items
- **wishlistItems**: Individual items in wishlists
- **wishlistCollaborators**: Users who can view/edit wishlists
- **priceHistory**: Historical price data for items
- **priceAlerts**: User-defined price thresholds for notifications
- **notifications**: System notifications for users
- **userDevices**: Registered user devices (for mobile app)
- **calendarEvents**: Events synced with external calendars
- **userCalendars**: Connected external calendar accounts

## Authentication System

The authentication system supports multiple methods:

1. **Session-based Authentication**
   - Used for the web application
   - Managed through Express sessions with PostgreSQL session store

2. **JWT Authentication**
   - Used for API access and browser extension
   - Tokens issued with configurable expiration

3. **OAuth Integration**
   - Used for external calendar authentication
   - Supports Google, Microsoft, and Apple accounts

## Key API Endpoints

### Authentication
- `POST /api/auth/register`: Create a new user account
- `POST /api/auth/login`: Authenticate a user
- `GET /api/auth/me`: Get current user information

### Wishlists
- `GET /api/wishlists`: List user's wishlists
- `POST /api/wishlists`: Create a new wishlist
- `GET /api/wishlists/:id`: Get a specific wishlist
- `PATCH /api/wishlists/:id`: Update a wishlist
- `DELETE /api/wishlists/:id`: Delete a wishlist

### Wishlist Items
- `GET /api/wishlists/:id/items`: List items in a wishlist
- `POST /api/items`: Add a new item
- `PATCH /api/items/:id`: Update an item
- `DELETE /api/items/:id`: Delete an item
- `GET /api/items/:id/price-history`: Get price history for an item

### Price Tracking
- `POST /api/price-alerts`: Create a price alert
- `GET /api/price-alerts`: List user's price alerts
- `DELETE /api/price-alerts/:id`: Delete a price alert
- `GET /api/price-drops`: Get recent price drops

### Calendar Integration
- `GET /api/calendar/events`: List calendar events
- `POST /api/calendar/events`: Create a calendar event
- `GET /api/calendar/auth/:provider`: Get OAuth URL for a calendar provider
- `GET /api/calendar/connections`: List connected calendars
- `POST /api/calendar/connections/:id/sync`: Sync with external calendar

### E-commerce Platform Integration
- `GET /api/ecommerce/platforms`: List supported e-commerce platforms
- `GET /api/ecommerce/search`: Search products across platforms
- `POST /api/ecommerce/product`: Extract product data from URL
- `POST /api/ecommerce/affiliate-link`: Generate affiliate links

## Environment Variables

The following environment variables need to be set:

### Database
- `DATABASE_URL`: PostgreSQL connection string
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: Individual PostgreSQL connection parameters

### Authentication
- `JWT_SECRET`: Secret key for JWT token generation
- `SESSION_SECRET`: Secret for Express session

### External APIs
- `OPENAI_API_KEY`: For AI-powered recommendations
- `SENDGRID_API_KEY`: For email notifications
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Google Calendar integration
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`: For Outlook Calendar integration
- `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`: For Apple Calendar integration

### E-commerce Platform APIs
- `AMAZON_API_KEY`, `AMAZON_API_SECRET`, `AMAZON_PARTNER_ID`
- `EBAY_API_KEY`, `EBAY_API_SECRET`
- `ETSY_API_KEY`, `ETSY_API_SECRET`
- And similar keys for other platforms (Walmart, Target, Best Buy)

### Analytics
- `VITE_GA_MEASUREMENT_ID`: Google Analytics measurement ID

## Development Workflow

1. **Setup**
   - Clone the repository
   - Install dependencies with `npm install`
   - Set up environment variables
   - Create a PostgreSQL database

2. **Running Locally**
   - Start the development server with `npm run dev`
   - This will start both the backend and frontend in development mode

3. **Database Migrations**
   - Database schema changes are managed through Drizzle
   - Push schema changes with `npm run db:push`

4. **Testing**
   - Run tests with `npm test`
   - Backend tests use Vitest
   - Frontend tests use Testing Library and Vitest

5. **Deployment**
   - The web application is deployed to Firebase Hosting
   - The database uses Firebase Firestore
   - Deploy with `firebase deploy --only hosting` for web app
   - Deploy with `firebase deploy --only firestore` for database rules
   - Ensure all environment variables are set before deployment

## Extension Development

The browser extension consists of three main components:

1. **Background Script**: Manages authentication and communication with the backend
2. **Content Script**: Executes on e-commerce websites to extract product information
3. **Popup UI**: Provides user interface for the extension

Extension files are located in `client/public/extension/`.

## Mobile App Development

The mobile app is planned for future development using React Native or a similar framework. The current codebase includes a placeholder directory at `mobile/`.

## Contributing Guidelines

1. **Code Style**
   - Follow TypeScript best practices
   - Use ESLint and Prettier for code formatting
   - Write meaningful comments for complex logic

2. **Git Workflow**
   - Create feature branches for new features
   - Submit pull requests for review
   - Include tests for new functionality

3. **Documentation**
   - Update documentation when making significant changes
   - Document API endpoints and schema changes

## Performance Considerations

1. **Database Queries**
   - Use indexes for frequently queried fields
   - Optimize complex queries with proper joins

2. **Frontend**
   - Use React Query for efficient data fetching and caching
   - Implement virtualization for long lists

3. **API Requests**
   - Implement rate limiting for external API calls
   - Cache responses where appropriate

4. **Image Processing**
   - Optimize images for web display
   - Consider using a CDN for static assets

## Security Best Practices

1. **Authentication**
   - Use HTTPS for all connections
   - Implement proper password hashing with bcrypt
   - Set secure and HTTP-only flags for cookies

2. **Input Validation**
   - Validate all user inputs with Zod schemas
   - Sanitize inputs to prevent XSS attacks

3. **API Security**
   - Implement proper CORS policies
   - Use rate limiting to prevent abuse
   - Validate JWT tokens on protected routes

4. **Database Security**
   - Use parameterized queries to prevent SQL injection
   - Implement row-level security where appropriate

---

For questions or further information, contact the development team.