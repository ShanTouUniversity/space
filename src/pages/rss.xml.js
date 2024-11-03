import rss, { pagesGlobToRssItems } from '@astrojs/rss';

export async function GET(context) {
  return rss({
    title: 'ST.U Space',
    description: 'ST.U 的试验田。',
    site: context.site,
    items: await pagesGlobToRssItems(import.meta.glob('./**/*.{md,markdown,mdown,mkd,mdwn,mdx}')),
    customData: `<language>zh-cn</language>`,
  });
}