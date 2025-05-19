# WishKeeper Mobile

This directory contains the React Native mobile application for WishKeeper.

## Features

- Cross-platform (iOS and Android) wishlist management
- Synchronized data with web application
- Push notifications for price drops and wishlist updates
- Camera integration for adding items
- Social sharing capabilities
- AR visualization on compatible devices

## Project Structure

- `/src`: Main application code
  - `/components`: Reusable UI components
  - `/screens`: Application screens
  - `/navigation`: Navigation configuration
  - `/services`: API and data services
  - `/hooks`: Custom React hooks
  - `/utils`: Utility functions
  - `/assets`: Images, fonts, and other static assets
  - `/constants`: Constants and configuration
- `/ios`: iOS-specific code
- `/android`: Android-specific code

## Development

To start developing the mobile app, follow these steps:

1. Set up your environment according to the [React Native documentation](https://reactnative.dev/docs/environment-setup)
2. Install dependencies: `npm install`
3. Start the Metro bundler: `npm start`
4. Run on iOS: `npm run ios`
5. Run on Android: `npm run android`