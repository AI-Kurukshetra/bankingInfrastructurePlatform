import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 14px 40px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;

