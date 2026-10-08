import { connect } from '@worldroot/db';
import { DEMO_ACCOUNT, seedDemo } from './demo-town';

const connection = connect();
await connection.migrate();
const result = await seedDemo(connection.db);
await connection.close();

console.log(result.created ? 'Demo community created.' : 'Demo community already exists. Nothing changed.');
console.log(`  Open:     http://localhost:3000/c/${result.communitySlug}`);
console.log(`  Sign in:  ${DEMO_ACCOUNT.email}`);
console.log(`  Password: ${DEMO_ACCOUNT.password}`);
