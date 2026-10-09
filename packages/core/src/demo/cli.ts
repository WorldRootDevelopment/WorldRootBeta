import { connect } from '@worldroot/db';
import { DEMO_ACCOUNT, seedDemo } from './demo-town';
import { seedDndDemo } from './dnd-demo';

const connection = connect();
await connection.migrate();
const result = await seedDemo(connection.db);
const dnd = await seedDndDemo(connection.db);
await connection.close();

console.log(result.created ? 'Demo community created.' : 'Demo community already exists. Nothing changed.');
console.log(dnd.created ? 'DnD demo community created.' : 'DnD demo community already exists. Nothing changed.');
console.log(`  Open:     http://localhost:3000/c/${result.communitySlug}`);
console.log(`            http://localhost:3000/c/${dnd.communitySlug}`);
console.log(`  Sign in:  ${DEMO_ACCOUNT.email}`);
console.log(`  Password: ${DEMO_ACCOUNT.password}`);
