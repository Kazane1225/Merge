package com.merge.merge_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.merge.merge_backend.repository.ArticleRepository;
import com.merge.merge_backend.entity.Article;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ArticleServiceImpl implements ArticleService {

    @Autowired
    private ArticleRepository articleRepository;

    @Override
    public List<Article> getAllArticles() {
        return articleRepository.findByDeleteFlgFalse();
    }

    @Override
    public List<Article> searchArticles(String keyword, String sort, String period) {
        List<Article> articles = filterByKeyword(keyword);
        articles = filterByPeriod(articles, period);
        articles = sortArticles(articles, sort);
        return articles;
    }

    @Override
    public Article createArticle(Article article) {
        return articleRepository.save(article);
    }

    private List<Article> filterByKeyword(String keyword) {
        if (keyword != null && !keyword.isEmpty()) {
            return articleRepository.findByTitleContainingIgnoreCaseOrRenderedBodyContainingIgnoreCaseAndDeleteFlgFalse(keyword, keyword);
        }
        return articleRepository.findByDeleteFlgFalse();
    }

    private List<Article> filterByPeriod(List<Article> articles, String period) {
        if ("all".equals(period)) {
            return articles;
        }

        LocalDateTime sinceDate = LocalDateTime.now();
        if ("week".equals(period)) {
            sinceDate = sinceDate.minusWeeks(1);
        } else if ("month".equals(period)) {
            sinceDate = sinceDate.minusMonths(1);
        }

        final LocalDateTime filterDate = sinceDate;
        return articles.stream()
            .filter(a -> a.getCreatedAt() != null && a.getCreatedAt().isAfter(filterDate))
            .collect(Collectors.toList());
    }

    private List<Article> sortArticles(List<Article> articles, String sort) {
        articles.sort((a, b) -> {
            LocalDateTime aTime = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
            LocalDateTime bTime = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
            return bTime.compareTo(aTime);
        });
        return articles;
    }
}
