package com.merge.merge_backend.controller;

import com.merge.merge_backend.entity.Article;
import com.merge.merge_backend.entity.Memo;
import com.merge.merge_backend.repository.ArticleRepository;
import com.merge.merge_backend.repository.MemoRepository;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api")
public class MemoController {

    @Autowired
    private MemoRepository memoRepository;

    @Autowired
    private ArticleRepository articleRepository;
    
    @GetMapping("/memos")
    public List<Memo> getAllMemos() {
        return memoRepository.findAll();
    }

    @GetMapping("/article/{articleId}")
    public List<Memo> getMemosByArticle(@PathVariable Long articleId) {
        return memoRepository.findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(articleId);
    }

    @GetMapping("/memos/search")
    public List<Memo> getMemosByUrl(@RequestParam String url) {
        Article article = articleRepository.findByUrl(url);
        if (article == null) {
            return Collections.emptyList();
        }
        return memoRepository.findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(article.getId());
    }

    @PostMapping("/memos")
    public Memo createMemo(@RequestBody Memo memo) {
        Article article = memo.getArticle();
        
        if (article != null) {
            Article existingArticle = articleRepository.findByUrl(article.getUrl());
            
            if (existingArticle != null) {
                // 既存記事の内容を更新（特にcover_imageなど）
                existingArticle.setTitle(article.getTitle());
                existingArticle.setRenderedBody(article.getRenderedBody());
                if (article.getCoverImage() != null) {
                    existingArticle.setCoverImage(article.getCoverImage());
                }
                article = articleRepository.save(existingArticle);
            } else {
                article = articleRepository.save(article);
            }
            
            memo.setArticle(article);
        }

        return memoRepository.save(memo);
    }
}