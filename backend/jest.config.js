/**
 * Jest 配置 — Sprint 2.1 Day 3
 *
 * 测试范围：
 * - Repository 业务行为（mock Prisma）
 * - Service 业务编排（mock Repository）
 * - Resolver 纯函数（无 mock）
 * - v1.3 强制规范：禁止直接 setCurrentStatus（必须抛 DirectStatusUpdateError）
 *
 * ⚠️ Day 3 不连真数据库（沙箱无 MySQL），采用 mock 验证业务行为。
 * Sprint 4 集成测试阶段再连真实数据库做 E2E 验收。
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src/__tests__', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@smartgrade/shared/(.*)$': '<rootDir>/../shared/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
      useESM: false,
      isolatedModules: true,
    }],
  },
  collectCoverageFrom: [
    'src/repositories/**/*.ts',
    'src/services/**/*.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'src/__tests__/',
    'src/db/prisma.client.ts',
  ],
};
