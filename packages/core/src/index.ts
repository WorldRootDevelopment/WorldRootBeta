// The database handle is created here so apps never import the database package.
export { connect, type Db, type DbConnection } from '@worldroot/db';

export * from './platform/audit';
export * from './platform/authorize';
export * from './platform/errors';
export * from './platform/outbox';
export * from './platform/validate';

export * from './identity/auth';
export * from './identity/account';
export * from './identity/badges';
export * from './identity/profile';
export * from './identity/profile-view';
export * from './identity/staff';

export * from './characters/service';
export * from './community/service';
export * from './worlds/service';

export { DEMO_ACCOUNT, DEMO_COMMUNITY_SLUG, grantDemoAccess, seedDemo } from './demo/demo-town';
export { DND_DEMO_COMMUNITY_SLUG, seedDndDemo } from './demo/dnd-demo';
export * from './scenes/service';
export * from './community/admin';
export * from './community/access';
export * from './messaging/service';
export * from './community/presence';

export * from './templates/catalog';
export * from './templates/service';
export * from './moderation/reports';
export * from './notifications/service';
export * from './discover/service';
export * from './platform/rich-fields';
export * from './media/images';
export * from './media/service';
export * from './media/storage';
export * from './scenes/dice';
export * from './scenes/rolls';
export * from './identity/achievements';
export * from './identity/friends';
