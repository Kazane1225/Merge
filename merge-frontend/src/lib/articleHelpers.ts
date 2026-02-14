export type ArticleSource = 'database' | 'qiita' | 'dev';

export const getArticleSource = (article: any): ArticleSource => {
  if (article.url?.includes('qiita.com')) return 'qiita';
  if (article.url?.includes('dev.to')) return 'dev';
  return 'database';
};

export const getBadgeClasses = (source: ArticleSource) => {
  switch (source) {
    case 'qiita':
      return 'bg-green-900/80 text-green-200 border-green-700/60';
    case 'dev':
      return 'bg-purple-900/80 text-purple-200 border-purple-700/60';
    case 'database':
    default:
      return 'bg-blue-900/80 text-blue-200 border-blue-700/60';
  }
};

export const getSourceLabel = (source: ArticleSource) => {
  switch (source) {
    case 'qiita':
      return 'Qiita';
    case 'dev':
      return 'Dev.to';
    case 'database':
    default:
      return 'DB';
  }
};
