import { connect } from '@worldroot/db';
import { DEMO_ACCOUNT, seedStarTrekDemo } from './star-trek';

const connection = connect();
await connection.migrate();
const result = await seedStarTrekDemo(connection.db);
await connection.close();

console.log(result.created ? 'Demo community created.' : 'Demo community already exists. Nothing changed.');
console.log(`  Open:     http://localhost:3000/c/${result.communitySlug}`);
console.log(`  Sign in:  ${DEMO_ACCOUNT.email}`);
console.log(`  Password: ${DEMO_ACCOUNT.password}`);
