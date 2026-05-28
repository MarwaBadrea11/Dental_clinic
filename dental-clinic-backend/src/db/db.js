import Knex from 'knex';
import { env } from '../config/env.js';
import knexConfig from './knexfile.js';

const config = knexConfig[env.NODE_ENV] ?? knexConfig['development'];

export const db = Knex(config);
