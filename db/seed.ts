import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const ROLES = [
  { name: "Admin", normalized: "ADMIN", description: "Administrator sistem" },
  { name: "Teacher", normalized: "TEACHER", description: "Pengajar" },
  { name: "Student", normalized: "STUDENT", description: "Peserta didik" },
];

const ROLE_CLAIMS: Record<string, string[]> = {
  ADMIN: [
    "user.read",
    "user.write",
    "role.read",
    "role.write",
    "course.read",
    "course.write",
  ],
  TEACHER: ["course.read", "course.write"],
  STUDENT: ["course.read"],
};

const ADMIN_USER = {
  username: "admin",
  email: "admin@eduka.local",
  fullName: "Administrator",
  password: "password",
};

async function seed() {
  for (const key of ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"]) {
    if (!process.env[key]) throw new Error(`${key} belum di-set`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // CORE_Role
    for (const r of ROLES) {
      await client.query(
        `INSERT INTO "CORE_Role" (name, normalized_name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (normalized_name)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [r.name, r.normalized, r.description]
      );
    }

    // CORE_RoleClaim
    for (const [roleNormalized, permissions] of Object.entries(ROLE_CLAIMS)) {
      for (const permission of permissions) {
        await client.query(
          `INSERT INTO "CORE_RoleClaim" (role_id, claim_type, claim_value)
           SELECT id, 'permission', $2
           FROM "CORE_Role"
           WHERE normalized_name = $1
           ON CONFLICT (role_id, claim_type, claim_value) DO NOTHING`,
          [roleNormalized, permission]
        );
      }
    }

    // CORE_User (admin)
    const passwordHash = await bcrypt.hash(ADMIN_USER.password, 10);
    await client.query(
      `INSERT INTO "CORE_User" (role_id, username, email, full_name, password_hash)
       SELECT id, $1, $2, $3, $4
       FROM "CORE_Role"
       WHERE normalized_name = 'ADMIN'
       ON CONFLICT DO NOTHING`,
      [
        ADMIN_USER.username,
        ADMIN_USER.email,
        ADMIN_USER.fullName,
        passwordHash,
      ]
    );

    await client.query("COMMIT");
    console.log("Seed selesai.");
    console.log(`Login admin: ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});