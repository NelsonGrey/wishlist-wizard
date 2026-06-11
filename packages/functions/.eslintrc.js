module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
    "/shared/**/*", // Shared helpers are compiled separately.
    "/test/**/*", // Test scripts are not part of functions runtime lint scope.
  ],
  rules: {},
};
