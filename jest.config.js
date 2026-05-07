module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|react-native|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo/.*|@react-navigation/.*)/)",
  ],
};
