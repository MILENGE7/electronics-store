// Refuses to boot with missing core settings, so a misconfigured deploy fails
// immediately with a clear message instead of later with a cryptic one.
const REQUIRED = ["DATABASE_URL", "JWT_SECRET", "CLIENT_URL"];

// Features that degrade (rather than break the whole app) when unset.
const OPTIONAL = {
  PAYSTACK_SECRET_KEY: "online payments will fail",
  CLOUDINARY_CLOUD_NAME: "product image uploads will fail",
  CLOUDINARY_API_KEY: "product image uploads will fail",
  CLOUDINARY_API_SECRET: "product image uploads will fail",
  SMTP_HOST: "order emails won't be sent",
};

function checkEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing required environment variables: ${missing.join(", ")}. See backend/.env.example.`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET.length < 32) {
    console.warn("JWT_SECRET is shorter than 32 characters — use a long random string in production.");
  }
  for (const [key, effect] of Object.entries(OPTIONAL)) {
    if (!process.env[key]) console.warn(`${key} is not set — ${effect}.`);
  }
}

module.exports = checkEnv;
