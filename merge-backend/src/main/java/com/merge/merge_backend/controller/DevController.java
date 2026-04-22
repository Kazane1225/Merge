package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
import com.merge.merge_backend.service.DevService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dev")
public class DevController {

    @Autowired
    private DevService devService;

    @GetMapping("/search")
    public List<DevItem> searchArticles(
            @RequestParam String keyword,
            @RequestParam(required = false, defaultValue = "rel") String sort,
            @RequestParam(required = false, defaultValue = "all") String period) {
        return devService.searchArticles(keyword, sort, period);
    }

    @GetMapping("/hot")
    public List<DevItem> getHotArticles(
            @RequestParam(required = false, defaultValue = "all") String period) {
        return devService.getHotArticles(period);
    }

    @GetMapping("/timeline")
    public List<DevItem> getTimelineArticles() {
        return devService.getTimelineArticles();
    }

    @GetMapping("/article/{id}")
    public DevItem getArticleDetail(@PathVariable String id) {
        return devService.getArticleDetail(id);
    }

    @GetMapping("/article-by-slug/{username}/{slug}")
    public DevItem getArticleBySlug(@PathVariable String username, @PathVariable String slug) {
        return devService.getArticleBySlug(username, slug);
    }

    @GetMapping("/article/{id}/comments")
    public List<DevCommentItem> getArticleComments(@PathVariable String id) {
        return devService.getArticleComments(id);
    }

    @GetMapping("/user/{username}/articles")
    public List<DevItem> getUserArticles(@PathVariable String username) {
        return devService.getUserArticles(username);
    }
}