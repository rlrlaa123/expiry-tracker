module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // drizzle 마이그레이션 .sql 파일을 문자열로 임포트
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
