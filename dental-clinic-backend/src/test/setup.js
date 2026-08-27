/**
 * Vitest test setup
 * Loads environment variables for tests
 */

import { config } from 'dotenv';

// Load .env file for tests
config();

// Ensure we're in test mode
process.env.NODE_ENV = 'test';
