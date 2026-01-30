package com.merge.merge_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.merge.merge_backend.service.ArticleService;
import com.merge.merge_backend.entity.Article;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ArticleController {

    @Autowired
    private ArticleService articleService;
    
    @GetMapping("/articles")
    public List<Article> getAllArticles() {
        return articleService.getAllArticles();
    }
    
    @GetMapping("/articles/search")
    public List<Article> searchArticles(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "rel") String sort,
            @RequestParam(required = false, defaultValue = "all") String period) {
        return articleService.searchArticles(keyword, sort, period);
    }
    
    @PostMapping("/articles")
    public Article createArticle(@RequestBody Article article) {
        return articleService.createArticle(article);
    }
}