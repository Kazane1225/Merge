package com.merge.merge_backend.service;

import com.merge.merge_backend.config.QiitaProperties;
import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class QiitaServiceImpl implements QiitaService {

    private static final Logger log = LoggerFactory.getLogger(QiitaServiceImpl.class);

    private static final String QIITA_API_URL = "https://qiita.com/api/v2/items";
    private static final String QIITA_USER_API_URL = "https://qiita.com/api/v2/users";

    private final RestClient restClient;
    private final QiitaProperties qiitaProperties;
    private final Clock clock;

    public QiitaServiceImpl(@Qualifier("qiitaRestClient") RestClient restClient,
                             QiitaProperties qiitaProperties, Clock clock) {
        this.restClient = restClient;
        this.qiitaProperties = qiitaProperties;
        this.clock = clock;
    }

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

    // ── ウォームアップ (CacheWarmUpRunner から @Async で呼ばれる) ─
    @Override
    public void warmUp() {
        log.info("[Qiita] Cache warm-up start");
        for (String period : List.of("week", "month")) {
            fetchAndCache(period);
        }
        log.info("[Qiita] Cache warm-up done");
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
        String query = buildSearchQuery(keyword, period);
        int pages = switch (sort) {
            case "count"   -> 5;
            case "created" -> 2;
            default        -> 1;
        };
        List<QiitaItem> results = filterByPeriod(fetchMultiplePages(query, pages), period);
        return switch (sort) {
            case "count" -> results.stream()
                    .sorted(Comparator.comparingInt(QiitaItem::getLikesCount).reversed())
                    .toList();
            default -> results;
        };
    }

    /** キーワードと期間を組み合わせた Qiita 検索クエリを構築する (API 側の pre-filter 用) */
    private String buildSearchQuery(String keyword, String period) {
        List<String> parts = new ArrayList<>();
        if (keyword != null && !keyword.isBlank()) parts.add(keyword);
        LocalDate sinceDate = sinceDate(period);
        if (sinceDate != null)
            parts.add("created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        return String.join(" ", parts);
    }

    /** Java 側で created_at を見て期間外の記事を除外する */
    private List<QiitaItem> filterByPeriod(List<QiitaItem> items, String period) {
        LocalDate since = sinceDate(period);
        if (since == null) return items;
        return items.stream()
                .filter(a -> {
                    if (a.getCreatedAt() == null || a.getCreatedAt().length() < 10) return false;
                    try {
                        LocalDate created = LocalDate.parse(a.getCreatedAt().substring(0, 10));
                        return !created.isBefore(since);
                    } catch (Exception e) {
                        return true;
                    }
                })
                .toList();
    }

    /** period 文字列を「以降」の LocalDate に変換する。"all" は null を返す */
    private LocalDate sinceDate(String period) {
        return switch (period != null ? period : "all") {
            case "1day"  -> LocalDate.now(clock).minusDays(1);
            case "week"  -> LocalDate.now(clock).minusWeeks(1);
            case "month" -> LocalDate.now(clock).minusMonths(1);
            case "year"  -> LocalDate.now(clock).minusYears(1);
            default      -> null;
        };
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
        URI uri = UriComponentsBuilder.fromUriString(QIITA_API_URL)
                .queryParam("page", 1)
                .queryParam("per_page", 100)
                .build().toUri();
        return fetchFromQiita(uri);
    }

    // ── 内部処理 ──────────────────────────────────────────────────
    private List<QiitaItem> fetchAndCache(String period) {
        QiitaProperties.Period cfg = qiitaProperties.getPeriod(period);
        String rawQuery = buildHotQuery(period, cfg.getMinStocks());

        log.info("[Qiita] Fetching {} pages for period='{}' (minStocks={})",
                cfg.getPages(), period, cfg.getMinStocks());

        List<QiitaItem> all = new ArrayList<>();
        for (int page = 1; page <= cfg.getPages(); page++) {
            URI uri = UriComponentsBuilder.fromUriString(QIITA_API_URL)
                    .queryParam("page", page)
                    .queryParam("per_page", 100)
                    .queryParam("query", "{q}")
                    .buildAndExpand(rawQuery)
                    .toUri();
            List<QiitaItem> pageItems = fetchFromQiita(uri);
            if (pageItems.isEmpty()) break;
            all.addAll(pageItems);
        }

        List<QiitaItem> result = all.stream()
                .sorted(Comparator.comparingInt(QiitaItem::getLikesCount).reversed())
                .toList();

        log.info("[Qiita] Cached {} items for period='{}'", result.size(), period);
        hotCache.put(period, new CacheEntry(result, cfg.getTtlSeconds()));
        return result;
    }

    private String buildHotQuery(String period, int minStocks) {
        LocalDate sinceDate = switch (period) {
            case "1day"  -> LocalDate.now(clock).minusDays(1);
            case "week"  -> LocalDate.now(clock).minusWeeks(1);
            case "month" -> LocalDate.now(clock).minusMonths(1);
            case "year"  -> LocalDate.now(clock).minusYears(1);
            default      -> LocalDate.now(clock).minusYears(10);
        };
        return "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=" + minStocks;
    }

    /** 指定クエリで最大 pages ページ取得して結合する（id重複を除去） */
    private List<QiitaItem> fetchMultiplePages(String query, int pages) {
        Map<String, QiitaItem> seen = new LinkedHashMap<>();
        for (int page = 1; page <= pages; page++) {
            URI uri = UriComponentsBuilder.fromUriString(QIITA_API_URL)
                    .queryParam("page", page)
                    .queryParam("per_page", 100)
                    .queryParam("query", "{q}")
                    .buildAndExpand(query)
                    .toUri();
            List<QiitaItem> items = fetchFromQiita(uri);
            if (items.isEmpty()) break;
            for (QiitaItem item : items) {
                if (item.getId() != null) seen.putIfAbsent(item.getId(), item);
            }
        }
        return new ArrayList<>(seen.values());
    }

    private List<QiitaItem> fetchFromQiita(URI uri) {
        log.debug("[Qiita] GET {}", uri);
        try {
            QiitaItem[] items = restClient.get().uri(uri).retrieve().body(QiitaItem[].class);
            int count = items != null ? items.length : 0;
            log.debug("[Qiita] Received {} items from {}", count, uri);
            return new ArrayList<>(Arrays.asList(items != null ? items : new QiitaItem[0]));
        } catch (RestClientResponseException e) {
            log.warn("[Qiita] HTTP {} for {}: {}",
                    e.getStatusCode(), uri, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Qiita] Fetch error for {}: {}", uri, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public QiitaItem getArticleDetail(String itemId) {
        URI uri = UriComponentsBuilder.fromUriString(QIITA_API_URL + "/{id}")
                .buildAndExpand(itemId).toUri();
        log.debug("[Qiita] GET article {}", itemId);
        try {
            QiitaItem item = restClient.get().uri(uri).retrieve().body(QiitaItem.class);
            return item != null ? item : new QiitaItem();
        } catch (RestClientResponseException e) {
            log.warn("[Qiita] HTTP {} fetching article {}: {}",
                    e.getStatusCode(), itemId, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return new QiitaItem();
        } catch (Exception e) {
            log.error("[Qiita] Error fetching article {}: {}", itemId, e.getMessage());
            return new QiitaItem();
        }
    }

    @Override
    public List<QiitaCommentItem> getArticleComments(String itemId) {
        URI uri = UriComponentsBuilder.fromUriString(QIITA_API_URL + "/{id}/comments")
                .buildAndExpand(itemId).toUri();
        log.debug("[Qiita] GET comments for article {}", itemId);
        try {
            QiitaCommentItem[] comments = restClient.get().uri(uri).retrieve()
                    .body(QiitaCommentItem[].class);
            return Arrays.stream(comments != null ? comments : new QiitaCommentItem[0])
                    .filter(c -> c.getId() != null)
                    .collect(Collectors.toList());
        } catch (RestClientResponseException e) {
            log.warn("[Qiita] HTTP {} fetching comments for {}: {}",
                    e.getStatusCode(), itemId, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Qiita] Error fetching comments for {}: {}", itemId, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<QiitaItem> getUserArticles(String userId) {
        URI uri = UriComponentsBuilder.fromUriString(QIITA_USER_API_URL + "/{id}/items")
                .queryParam("per_page", 100)
                .buildAndExpand(userId).toUri();
        log.debug("[Qiita] GET articles for user {}", userId);
        try {
            QiitaItem[] items = restClient.get().uri(uri).retrieve().body(QiitaItem[].class);
            return new ArrayList<>(Arrays.asList(items != null ? items : new QiitaItem[0]));
        } catch (RestClientResponseException e) {
            log.warn("[Qiita] HTTP {} fetching articles for user {}: {}",
                    e.getStatusCode(), userId, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Qiita] Error fetching articles for user {}: {}", userId, e.getMessage());
            return Collections.emptyList();
        }
    }
}
