interface TwitterWidgets {
  createTweet(
    tweetId: string,
    container: HTMLElement,
    options?: { theme?: string; conversation?: string; dnt?: boolean; align?: string }
  ): Promise<HTMLElement | undefined>;
  load(element?: HTMLElement): void;
}

interface TwitterGlobal {
  widgets: TwitterWidgets;
}

interface Window {
  twttr?: TwitterGlobal;
}
