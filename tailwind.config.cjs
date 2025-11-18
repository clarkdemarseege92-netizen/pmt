// tailwind.config.cjs (正确的)

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}" 
  ],
  theme: {
    extend: {},
  },

  // 【重要】我们必须把这个加回去
  // `@plugin "daisyui"` 会读取这个配置
  daisyui: {
    themes: ["light", "dark", "cupcake"], 
  },

  // 【重要】'plugins' 数组保持为空或不存在
  // (因为我们用的是 CSS 中的 @plugin)
  plugins: [],
}