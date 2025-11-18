/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // v4 的核心插件
    'autoprefixer': {}, // 您的 package.json 中已包含
  },
}