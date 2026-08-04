// Taro 项目 babel 配置
// babel-preset-taro 已包含 TypeScript 支持，但要确保正确加载
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5'
    }]
  ]
};
