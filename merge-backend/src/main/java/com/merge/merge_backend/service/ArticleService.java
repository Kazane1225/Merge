package com.merge.merge_backend.service;

import com.merge.merge_backend.entity.Article;
import java.util.List;

public interface ArticleService {
    List<Article> getAllArticles();
    List<Article> searchArticles(String keyword, String sort, String period);
    Article createArticle(Article article);
}
