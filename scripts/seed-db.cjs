const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create roles
    const roles = ['SUPERADMIN', 'FINANCE', 'CASHIER'];
    for (const roleName of roles) {
      await client.query(
        'INSERT INTO "roles" (id, name) VALUES (gen_random_uuid(), $1) ON CONFLICT (name) DO NOTHING',
        [roleName]
      );
      console.log(`Created role: ${roleName}`);
    }

    // Create users
    const password = 'TestPass123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const users = ['superadmin', 'finance', 'cashier'];
    for (const username of users) {
      const roleResult = await client.query(
        'SELECT id FROM "roles" WHERE name = $1',
        [username.toUpperCase()]
      );

      if (roleResult.rows.length === 0) {
        console.error(`Role not found for user: ${username}`);
        continue;
      }

      const roleId = roleResult.rows[0].id;
      await client.query(
        'INSERT INTO "users" (id, username, password_hash, role_id, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) ON CONFLICT (username) DO NOTHING',
        [username, passwordHash, roleId]
      );
      console.log(`Created user: ${username} (password: ${password})`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();
