import { loadStripe } from "@stripe/stripe-js";

// Publishable key is safe to expose client-side (unlike the secret key on the backend)
// Set VITE_STRIPE_PUBLISHABLE_KEY in a .env file at the frontend root.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
