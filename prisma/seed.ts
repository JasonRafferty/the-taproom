import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const FOUNDERS = [
  { username: "ashoka", displayName: "Ashoka Mullassery", avatarColor: "#D0FF14" },
  { username: "anulome", displayName: "Anulome Kishore", avatarColor: "#6C244C" },
  { username: "arvin", displayName: "Arvin Razavi", avatarColor: "#F2B84B" },
  { username: "jason", displayName: "Jason Rafferty", avatarColor: "#6FCF97" },
];

async function main() {
  // Read + guard inside main() so TypeScript's narrowing applies in the same
  // scope where the value is used — a module-scope guard doesn't carry into
  // a separate function body, which caused a tsc error.
  const sharedPassword = process.env.SEED_PASSWORD;
  if (!sharedPassword) {
    throw new Error("SEED_PASSWORD env var is required to seed users");
  }
  const passwordHash = await bcrypt.hash(sharedPassword, 10);
  for (const founder of FOUNDERS) {
    await prisma.user.upsert({
      where: { username: founder.username },
      update: {},
      create: { ...founder, passwordHash },
    });
  }
  console.log(`Seeded ${FOUNDERS.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
