// The database handle is created here so apps never import the database package.
export { connect, type Db, type DbConnection } from '@worldroot/db';

export * from './platform/audit';
export * from './platform/authorize';
export * from './platform/errors';
export * from './platform/outbox';

export * from './identity/auth';
export * from './identity/profile';

export * from './characters/service';
export * from './community/service';
export * from './worlds/service';

export { DEMO_ACCOUNT, seedStarTrekDemo } from './demo/star-trek';
