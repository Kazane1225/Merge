package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class DevServiceImpl implements DevService {

    private static final Logger log = LoggerFactory.getLogger(DevServiceImpl.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String BASE_URL = "https://dev.to/api/articles";
    private static final String BASE_COMMENT_URL = "https://dev.to/api/comments";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    @Value("${dev.access.token:}")
    private String devApiKey;

    // ── キャッシュ設定 ────────────────────────────────────────────
    private static class CacheEntry {
        final List<DevItem> items;
        final Instant expiresAt;
        CacheEntry(List<DevItem> items, long ttlSeconds) {
            this.items = items;
            this.expiresAt = Instant.now().plusSeconds(ttlSeconds);
        }
        boolean isValid() { return Instant.now().isBefore(expiresAt); }
    }

    private final Map<String, CacheEntry> hotCache = new ConcurrentHashMap<>();

    // 期間ごとの設定: {取得ページ数, 最小リアクション数, キャッシュTTL(秒)}
    private record PeriodConfig(int pages, int minReactions, long ttlSeconds) {}

    private static final Map<String, PeriodConfig> PERIOD_CONFIG = Map.of(
        "1day",  new PeriodConfig(1,   0,    15 * 60L),   // 1p  ×100件  / TTL 15分
        "week",  new PeriodConfig(3,   5,    30 * 60L),   // 3p  ×100件  / TTL 30分
        "month", new PeriodConfig(5,   30,   60 * 60L),   // 5p  ×100件  / TTL 60分
        "year",  new PeriodConfig(7,   150,  120 * 60L),  // 7p  ×100件  / TTL 2時間
        "all",   new PeriodConfig(10,  500,  120 * 60L)   // 10p ×100件  / TTL 2時間
    );

    // ── 起動時ウォームアップ (week / month を先読み) ─────────────
    @PostConstruct
    public void warmUp() {
        Thread t = new Thread(() -> {
            log.info("[Dev.to] Cache warm-up start");
            for (String period : List.of("week", "month")) {
                fetchAndCache(period);
            }
            log.info("[Dev.to] Cache warm-up done");
        }, "dev-warmup");
        t.setDaemon(true);
        t.start();
    }

    // ── 30分ごとにバックグラウンドでキャッシュ更新 ──────────────
    @Scheduled(fixedDelay = 30 * 60 * 1000)
    public void refreshCache() {
        for (String period : hotCache.keySet()) {
            log.info("[Dev.to] Background refresh: {}", period);
            fetchAndCache(period);
        }
    }

    // ── 公開API ──────────────────────────────────────────────────
    @Override
    public List<DevItem> searchArticles(String keyword, String sort, String period) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL)
                .queryParam("per_page", 300);
        if (keyword != null && !keyword.isEmpty()) builder.queryParam("tag", keyword);
        if (period != null && !period.equals("all")) {
            Integer days = convertPeriodToDays(period);
            if (days != null) builder.queryParam("top", days);
        }
        return fetchFromDev(builder.build().toUri());
    }

    @Override
    public List<DevItem> getHotArticles() {
        return getHotArticles("week");
    }

    @Override
    public List<DevItem> getHotArticles(String period) {
        CacheEntry entry = hotCache.get(period);
        if (entry != null && entry.isValid()) {
            log.debug("[Dev.to] Cache hit: {}", period);
            return entry.items;
        }
        return fetchAndCache(period);
    }

    @Override
    public List<DevItem> getTimelineArticles() {
        return fetchFromDev(URI.create(BASE_URL + "/latest?per_page=100"));
    }

    @Override
    public DevItem getArticleDetail(String itemId) {
        try {
            String url = BASE_URL + "/" + itemId;
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, createEntity(), String.class);
            String body = response.getBody();
            if (body == null || body.isEmpty()) return new DevItem();
            return new ObjectMapper().readValue(body, DevItem.class);
        } catch (Exception e) {
            return new DevItem();
        }
    }

    @Override
    public List<DevCommentItem> getArticleComments(String itemId) {
        try {
            String url = BASE_COMMENT_URL + "?a_id=" + itemId;
            ResponseEntity<DevCommentItem[]> response = restTemplate.exchange(url, HttpMethod.GET, createEntity(), DevCommentItem[].class);
            DevCommentItem[] items = response.getBody();
            return Arrays.asList(items != null ? items : new DevCommentItem[0]);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    // ── 内部処理 ──────────────────────────────────────────────────
    private List<DevItem> fetchAndCache(String period) {
        PeriodConfig cfg = PERIOD_CONFIG.getOrDefault(period, PERIOD_CONFIG.get("week"));
        Integer days = convertPeriodToDays(period);

        log.info("[Dev.to] Fetching {} pages for period='{}' (minReactions={})", cfg.pages(), period, cfg.minReactions());

        List<DevItem> all = new ArrayList<>();
        for (int page = 1; page <= cfg.pages(); page++) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL)
                    .queryParam("per_page", 100)
                    .queryParam("page", page);
            if (days != null) builder.queryParam("top", days);

            List<DevItem> pageItems = fetchFromDev(builder.build().toUri());
            if (pageItems.isEmpty()) break;
            all.addAll(pageItems);
        }

        List<DevItem> result = all.stream()
                .filter(a -> getReactions(a) >= cfg.minReactions())
                .sorted(Comparator.comparingInt(this::getReactions).reversed())
                .toList();

        log.info("[Dev.to] Cached {} items for period='{}'", result.size(), period);
        hotCache.put(period, new CacheEntry(result, cfg.ttlSeconds()));
        return result;
    }

    private int getReactions(DevItem item) {
        return item.getLikesCount() != null ? item.getLikesCount() : 0;
    }

    private List<DevItem> fetchFromDev(URI uri) {
        try {
            ResponseEntity<DevItem[]> response = restTemplate.exchange(uri, HttpMethod.GET, createEntity(), DevItem[].class);
            DevItem[] items = response.getBody();
            return new ArrayList<>(Arrays.asList(items != null ? items : new DevItem[0]));
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private HttpEntity<String> createEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", USER_AGENT);
        if (devApiKey != null && !devApiKey.isEmpty()) headers.set("api-key", devApiKey);
        return new HttpEntity<>(headers);
    }

    private Integer convertPeriodToDays(String period) {
        return switch (period) {
            case "1day"  -> 1;
            case "week"  -> 7;
            case "month" -> 30;
            case "year"  -> 365;
            case "all"   -> 3650;
            default      -> null;
        };
    }
}