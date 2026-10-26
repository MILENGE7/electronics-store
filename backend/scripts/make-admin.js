// Promotes an existing account to ADMIN. The site's register page only ever
// creates customers, so this is how the first admin gets made.
//
// Usage (from the backend folder):
//   1. Register the account normally on the website.
//   2. node scripts/make-admin.js you@example.com
//   3. Sign out and sign back in on the website.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Usage: node scripts/make-admin.js <email>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (!user) {
      console.error(`No account found for ${email}. Register it on the website first.`);
      process.exit(1);
    }
    if (user.role === "ADMIN") {
      console.log(`${user.email} is already an admin.`);
      return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    console.log(`${user.email} is now an admin. Sign out and sign back in on the website.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
