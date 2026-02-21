package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class QiitaServiceImpl implements QiitaService {

    private static final Logger log = LoggerFactory.getLogger(QiitaServiceImpl.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String QIITA_API_URL = "https://qiita.com/api/v2/items";

    @Value("${qiita.access.token:}")
    private String qiitaAccessToken;

    // ── キャッシュ設定 ────────────────────────────────────────────
    private static class CacheEntry {
        final List<QiitaItem> items;
        final Instant expiresAt;
        CacheEntry(List<QiitaItem> items, long ttlSeconds) {
            this.items = items;
            this.expiresAt = Instant.now().plusSeconds(ttlSeconds);
        }
        boolean isValid() { return Instant.now().isBefore(expiresAt); }
    }

    private final Map<String, CacheEntry> hotCache = new ConcurrentHashMap<>();

    // 期間ごとの設定: {取得ページ数(max100), 最小stocks数, キャッシュTTL(秒)}
    private record PeriodConfig(int pages, int minStocks, long ttlSeconds) {}

    private static final Map<String, PeriodConfig> PERIOD_CONFIG = Map.of(
        "1day",  new PeriodConfig(1,   3,    15 * 60L),   // 1p  ×100件 / TTL 15分
        "week",  new PeriodConfig(3,   10,   30 * 60L),   // 3p  ×100件 / TTL 30分
        "month", new PeriodConfig(5,   45,   60 * 60L),   // 5p  ×100件 / TTL 60分
        "year",  new PeriodConfig(7,   500,  120 * 60L),  // 7p  ×100件 / TTL 2時間
        "all",   new PeriodConfig(10,  2500, 120 * 60L)   // 10p ×100件 / TTL 2時間
    );

    // ── 起動時ウォームアップ (week / month を先読み) ─────────────
    @PostConstruct
    public void warmUp() {
        Thread t = new Thread(() -> {
            log.info("[Qiita] Cache warm-up start");
            for (String period : List.of("week", "month")) {
                fetchAndCache(period);
            }
            log.info("[Qiita] Cache warm-up done");
        }, "qiita-warmup");
        t.setDaemon(true);
        t.start();
    }

    // ── 30分ごとにバックグラウンドでキャッシュ更新 ──────────────
    @Scheduled(fixedDelay = 30 * 60 * 1000)
    public void refreshCache() {
        for (String period : hotCache.keySet()) {
            log.info("[Qiita] Background refresh: {}", period);
            fetchAndCache(period);
        }
    }

    // ── 公開API ──────────────────────────────────────────────────
    @Override
    public List<QiitaItem> searchArticles(String keyword, String sort, String period) {
        StringBuilder baseQueryBuilder = new StringBuilder();

        if (keyword != null && !keyword.isEmpty()) {
            baseQueryBuilder.append(keyword);
        }

        if (!"all".equals(period)) {
            LocalDate sinceDate = LocalDate.now();
            if ("week".equals(period)) {
                sinceDate = sinceDate.minusWeeks(1);
            } else if ("month".equals(period)) {
                sinceDate = sinceDate.minusMonths(1);
            }
            if (baseQueryBuilder.length() > 0) baseQueryBuilder.append(" ");
            baseQueryBuilder.append("created:>=").append(sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        String baseQuery = baseQueryBuilder.toString();
        List<QiitaItem> items;

        if ("count".equals(sort)) {
            int firstThreshold = "all".equals(period) ? 100 : 20;
            String queryHigh = (baseQuery + " stocks:>=" + firstThreshold).trim();
            items = fetchItemsWithQuery(queryHigh);

            if (items.size() < 50) {
                int secondThreshold = "all".equals(period) ? 20 : 5;
                String queryMid = (baseQuery + " stocks:>=" + secondThreshold).trim();
                List<QiitaItem> retryItems = fetchItemsWithQuery(queryMid);

                if (retryItems.size() < 10) {
                    items = fetchItemsWithQuery((baseQuery + " stocks:>=0").trim());
                } else {
                    items = retryItems;
                }
            }

            List<QiitaItem> sortedItems = new ArrayList<>(items);
            sortedItems.sort((a, b) -> {
                int countA = a.getLikesCount();
                int countB = b.getLikesCount();
                return Integer.compare(countB, countA);
            });
            return sortedItems;
        }

        return fetchItemsWithQuery(baseQuery);
    }

    @Override
    public List<QiitaItem> getHotArticles() {
        return getHotArticles("all");
    }

    @Override
    public List<QiitaItem> getHotArticles(String period) {
        CacheEntry entry = hotCache.get(period);
        if (entry != null && entry.isValid()) {
            log.debug("[Qiita] Cache hit: {}", period);
            return entry.items;
        }
        return fetchAndCache(period);
    }

    @Override
    public List<QiitaItem> getTimelineArticles() {
        return fetchFromQiita(URI.create(QIITA_API_URL + "?page=1&per_page=100"));
    }

    // ── 内部処理 ──────────────────────────────────────────────────
    private List<QiitaItem> fetchAndCache(String period) {
        PeriodConfig cfg = PERIOD_CONFIG.getOrDefault(period, PERIOD_CONFIG.get("week"));
        String rawQuery = buildHotQuery(period, cfg.minStocks());

        log.info("[Qiita] Fetching {} pages for period='{}' (minStocks={})", cfg.pages(), period, cfg.minStocks());

        List<QiitaItem> all = new ArrayList<>();
        try {
            String encodedQuery = URLEncoder.encode(rawQuery, StandardCharsets.UTF_8).replace("+", "%20");
            for (int page = 1; page <= cfg.pages(); page++) {
                // Qiita APIはpage最大100まで
                if (page > 100) break;
                String urlStr = QIITA_API_URL + "?page=" + page + "&per_page=100&query=" + encodedQuery;
                List<QiitaItem> pageItems = fetchFromQiita(URI.create(urlStr));
                if (pageItems.isEmpty()) break;
                all.addAll(pageItems);
            }
        } catch (Exception e) {
            log.error("[Qiita] fetchAndCache error for period='{}': {}", period, e.getMessage());
        }

        List<QiitaItem> result = all.stream()
                .sorted(Comparator.comparingInt(QiitaItem::getLikesCount).reversed())
                .toList();

        log.info("[Qiita] Cached {} items for period='{}'", result.size(), period);
        hotCache.put(period, new CacheEntry(result, cfg.ttlSeconds()));
        return result;
    }

    private String buildHotQuery(String period, int minStocks) {
        LocalDate sinceDate = switch (period) {
            case "1day"  -> LocalDate.now().minusDays(1);
            case "week"  -> LocalDate.now().minusWeeks(1);
            case "month" -> LocalDate.now().minusMonths(1);
            case "year"  -> LocalDate.now().minusYears(1);
            default      -> LocalDate.now().minusYears(10); // all
        };
        return "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=" + minStocks;
    }

    private List<QiitaItem> fetchItemsWithQuery(String rawQuery) {
        try {
            String encodedQuery = URLEncoder.encode(rawQuery, StandardCharsets.UTF_8).replace("+", "%20");
            String urlStr = QIITA_API_URL + "?page=1&per_page=100&query=" + encodedQuery;
            return fetchFromQiita(URI.create(urlStr));
        } catch (Exception e) {
            log.error("[Qiita] fetchItemsWithQuery error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<QiitaItem> fetchFromQiita(URI uri) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }
            ResponseEntity<QiitaItem[]> response = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), QiitaItem[].class);
            QiitaItem[] items = response.getBody();
            return new ArrayList<>(Arrays.asList(items != null ? items : new QiitaItem[0]));
        } catch (HttpStatusCodeException e) {
            log.warn("[Qiita] HTTP error {}: {}", e.getStatusCode(), uri);
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Qiita] fetch error: {} - {}", uri, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public QiitaItem getArticleDetail(String itemId) {
        String url = QIITA_API_URL + "/" + itemId;
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }
            ResponseEntity<QiitaItem> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), QiitaItem.class);
            QiitaItem item = response.getBody();
            return item != null ? item : new QiitaItem();
        } catch (Exception e) {
            log.error("[Qiita] getArticleDetail error: {}", e.getMessage());
            return new QiitaItem();
        }
    }

    @Override
    public List<QiitaCommentItem> getArticleComments(String itemId) {
        String url = QIITA_API_URL + "/" + itemId + "/comments";
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }
            ResponseEntity<QiitaCommentItem[]> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), QiitaCommentItem[].class);
            QiitaCommentItem[] comments = response.getBody();
            return Arrays.asList(comments != null ? comments : new QiitaCommentItem[0]);
        } catch (Exception e) {
            log.error("[Qiita] getArticleComments error: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}