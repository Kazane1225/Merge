package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.QiitaItem;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/qiita")
public class QiitaController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String QIITA_API_URL = "https://qiita.com/api/v2/items";

    @GetMapping("/search")
    public List<QiitaItem> searchArticles(@RequestParam String keyword) {
        String url = QIITA_API_URL + "?page=1&per_page=10&query=" + keyword;
        
        QiitaItem[] items = restTemplate.getForObject(url, QiitaItem[].class);
        return Arrays.asList(items != null ? items : new QiitaItem[0]);
    }

    @GetMapping("/hot")
    public List<QiitaItem> getHotArticles() {
        String url = QIITA_API_URL + "?page=1&per_page=10&query=stocks:>30";
        
        QiitaItem[] items = restTemplate.getForObject(url, QiitaItem[].class);
        return Arrays.asList(items != null ? items : new QiitaItem[0]);
    }
}