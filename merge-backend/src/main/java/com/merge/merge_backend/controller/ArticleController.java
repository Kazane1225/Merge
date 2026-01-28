package com.merge.merge_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.merge.merge_backend.repository.ArticleRepository;
import com.merge.merge_backend.entity.Article;
import java.util.List;

@RestController
@RequestMapping("/api")
public class ArticleController {

    @Autowired
    private ArticleRepository articleRepository;
    
    @GetMapping("/articles")
    public List<Article> getAllArticles() {
        return articleRepository.findAll();
    }
    
    @PostMapping("/articles")
    public Article createArticle(@RequestBody Article article) {
        return articleRepository.save(article);
    }
}