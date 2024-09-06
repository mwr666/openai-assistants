module.exports = {
  siteUrl: 'https://whocoversit.com',
  generateRobotsTxt: true,
  exclude: ['/api/*'],
  robotsTxtOptions: {
    additionalSitemaps: [
      'https://whocoversit.com/server-sitemap.xml',
    ],
  },
};
