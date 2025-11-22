module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "off", // Allow traditional functions
    "quotes": ["off", "double", {"allowTemplateLiterals": true}], // Allow both single and double quotes
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "linebreak-style": "off", // Disable for Windows
    "max-len": ["warn", {"code": 150}], // Increase max line length
    "comma-dangle": "off", // Allow missing trailing commas
    "no-trailing-spaces": "off", // Allow trailing spaces
    "indent": "off", // Disable strict indentation rules
    "camelcase": "off", // Allow non-camelcase identifiers
    "eol-last": "off", // Don't require newline at end of file
    "prefer-const": "off", // Allow let instead of const
    "object-curly-spacing": "off", // Allow spaces in curly braces
    "no-unused-vars": "off", // Allow unused variables
    "arrow-parens": "off", // Allow arrow functions without parentheses
    "no-multi-spaces": "off" // Allow multiple spaces
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};