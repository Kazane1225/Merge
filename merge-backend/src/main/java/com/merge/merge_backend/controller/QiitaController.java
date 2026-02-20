package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import com.merge.merge_backend.service.QiitaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/qiita")
public class QiitaController {

    @Autowired
    private QiitaService qiitaService;

    @GetMapping("/search")
    public List<QiitaItem> searchArticles(
            @RequestParam String keyword,
            @RequestParam(required = false, defaultValue = "rel") String sort,
            @RequestParam(required = false, defaultValue = "all") String period) {
        return qiitaService.searchArticles(keyword, sort, period);
    }

    @GetMapping("/hot")
    public List<QiitaItem> getHotArticles(
            @RequestParam(required = false, defaultValue = "all") String period) {
        return qiitaService.getHotArticles(period);
    }

    @GetMapping("/timeline")
    public List<QiitaItem> getTimelineArticles() {
        return qiitaService.getTimelineArticles();
    }

    @GetMapping("/article/{id}")
    public QiitaItem getArticleDetail(@PathVariable String id) {
        return qiitaService.getArticleDetail(id);
    }

    @GetMapping("/article/{id}/comments")
    public List<QiitaCommentItem> getArticleComments(@PathVariable String id) {
        return qiitaService.getArticleComments(id);
    }
}