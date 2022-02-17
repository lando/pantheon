module.exports = {
  lang: 'en-US',
  title: 'Lando',
  description: 'Lando is the best local development environment option for Pantheon, the fastest way to build modern web apps.',
  base: '/pantheon/',
  head: [
    ['meta', {name: 'viewport', content: 'width=device-width, initial-scale=1'}],
    ['link', {rel: 'icon', href: '/pantheon/favicon.ico', size: 'any'}],
    ['link', {rel: 'icon', href: '/pantheon/favicon.svg', type: 'image/svg+xml'}],
    ['link', {rel: 'preconnect', href: '//fonts.googleapis.com'}],
    ['link', {rel: 'preconnect', href: '//fonts.gstatic.com', crossorigin: true}],
    ['link', {rel: 'stylesheet', href: '//fonts.googleapis.com/css2?family=Lexend:wght@500&display=swap'}],
  ],
  theme: '@lando/vuepress-theme-default-plus',
  themeConfig: {
    landoDocs: true,
    logo: '/images/icon.svg',
    docsDir: 'docs',
    docsBranch: 'main',
    repo: 'lando/pantheon',
    sidebarHeader: {
      enabled: true,
      title: 'Pantheon Plugin',
      icon: '/images/pantheonicon.png',
    },
    sidebar: [
      {
        text: 'Overview',
        link: '/index.md',
      },
      '/getting-started.md',
      '/config.md',
      '/tooling.md',
      '/sync.md',
      '/environment.md',
      '/libraries.md',
      {
        text: 'Guides',
        collapsible: true,
        children: [
          {
            text: 'Connecting to your database',
            link: '/connecting-database.md',
          },
          {
            text: 'Working with Multidev',
            link: '/working-multidev.md',
          },
          {
            text: 'Using Drush',
            link: '/using-drush.md',
          },
          {
            text: 'Using Terminus',
            link: '/using-terminus.md',
          },
          {
            text: 'Utilizing WordPress Site Network Support (Experimental)',
            link: '/wordpress-site-network-support.md',
          },
        ],
      },
      '/support.md',
      {text: 'Examples', link: 'https://github.com/lando/pantheon/tree/main/examples'},
      {text: 'Release Notes', link: 'https://github.com/lando/pantheon/releases'},
      '/development.md',
    ],
  },
};
