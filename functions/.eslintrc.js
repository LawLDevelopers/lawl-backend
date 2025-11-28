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
  "no-restricted-globals": "off",
  "prefer-arrow-callback": "off",
  "quotes": "off",
  "valid-jsdoc": "off",
  "require-jsdoc": "off",
  "max-len": "off",
  "linebreak-style": "off",
  "indent": "off",
  "comma-dangle": "off",
  "object-curly-spacing": "off",
  "no-trailing-spaces": "off",
  "eol-last": "off",
  "arrow-parens": "off",
  "no-unused-vars": "off",
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
