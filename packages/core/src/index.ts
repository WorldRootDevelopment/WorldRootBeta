// The database handle is created here so apps never import the database package.
export { connect, type Db, type DbConnection } from '@worldroot/db';

export * from './platform/audit';
export * from './platform/authorize';
export * from './platform/errors';
export * from './platform/outbox';
export * from './platform/validate';

export * from './identity/auth';
export * from './identity/profile';

export * from './characters/service';
export * from './community/service';
export * from './worlds/service';

export { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, seedDemo } from './demo/demo-town';
export * from './scenes/service';
export * from './community/admin';
export * from './community/access';
export * from './messaging/service';
export * from './community/presence';

export * from './templates/catalog';
export * from './templates/service';
