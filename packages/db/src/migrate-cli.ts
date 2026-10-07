import { connect } from './client';

const connection = connect();
await connection.migrate();
await connection.close();
console.log('Migrations applied.');
