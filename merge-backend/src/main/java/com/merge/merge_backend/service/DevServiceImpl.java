package com.merge.merge_backend.service;

import com.merge.merge_backend.config.DevProperties;
import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
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
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class DevServiceImpl implements DevService {

    private static final Logger log = LoggerFactory.getLogger(DevServiceImpl.class);

    private static final String BASE_URL = "https://dev.to/api/articles";
    private static final String BASE_COMMENT_URL = "https://dev.to/api/comments";

    private final RestClient restClient;
    private final DevProperties devProperties;

    public DevServiceImpl(@Qualifier("devRestClient") RestClient restClient,
                          DevProperties devProperties) {
        this.restClient = restClient;
        this.devProperties = devProperties;
    }

    // ── キャッシュ ────────────────────────────────────────────────
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

    // ── ウォームアップ (CacheWarmUpRunner から @Async で呼ばれる) ─
    @Override
    public void warmUp() {
        log.info("[Dev.to] Cache warm-up start");
        for (String period : List.of("week", "month")) {
            fetchAndCache(period);
        }
        log.info("[Dev.to] Cache warm-up done");
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
        return switch (sort) {
            case "count" -> fetchSearchPages(keyword, period, 5).stream()
                    .sorted(Comparator.comparingInt(this::getReactions).reversed())
                    .toList();
            default -> fetchSearchPages(keyword, period, 1);
        };
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
        URI uri = UriComponentsBuilder.fromUriString(BASE_URL + "/{id}")
                .buildAndExpand(itemId).toUri();
        log.debug("[Dev.to] GET article {}", itemId);
        try {
            DevItem item = restClient.get().uri(uri).retrieve().body(DevItem.class);
            return item != null ? item : new DevItem();
        } catch (RestClientResponseException e) {
            log.warn("[Dev.to] HTTP {} fetching article {}: {}",
                    e.getStatusCode(), itemId, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return new DevItem();
        } catch (Exception e) {
            log.error("[Dev.to] Error fetching article {}: {}", itemId, e.getMessage());
            return new DevItem();
        }
    }

    @Override
    public DevItem getArticleBySlug(String username, String slug) {
        URI uri = UriComponentsBuilder.fromUriString(BASE_URL + "/{username}/{slug}")
                .buildAndExpand(username, slug).toUri();
        log.debug("[Dev.to] GET article by slug {}/{}", username, slug);
        try {
            DevItem item = restClient.get().uri(uri).retrieve().body(DevItem.class);
            return item != null ? item : new DevItem();
        } catch (RestClientResponseException e) {
            log.warn("[Dev.to] HTTP {} fetching article {}/{}: {}",
                    e.getStatusCode(), username, slug, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return new DevItem();
        } catch (Exception e) {
            log.error("[Dev.to] Error fetching article {}/{}: {}", username, slug, e.getMessage());
            return new DevItem();
        }
    }

    @Override
    public List<DevCommentItem> getArticleComments(String itemId) {
        URI uri = UriComponentsBuilder.fromUriString(BASE_COMMENT_URL)
                .queryParam("a_id", "{id}")
                .buildAndExpand(itemId).toUri();
        log.debug("[Dev.to] GET comments for article {}", itemId);
        try {
            DevCommentItem[] items = restClient.get().uri(uri).retrieve()
                    .body(DevCommentItem[].class);
            return Arrays.asList(items != null ? items : new DevCommentItem[0]);
        } catch (RestClientResponseException e) {
            log.warn("[Dev.to] HTTP {} fetching comments for {}: {}",
                    e.getStatusCode(), itemId, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Dev.to] Error fetching comments for {}: {}", itemId, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<DevItem> getUserArticles(String username) {
        URI uri = UriComponentsBuilder.fromUriString(BASE_URL)
                .queryParam("username", "{u}")
                .queryParam("per_page", 300)
                .buildAndExpand(username).toUri();
        log.debug("[Dev.to] GET articles for user {}", username);
        try {
            DevItem[] items = restClient.get().uri(uri).retrieve().body(DevItem[].class);
            return Arrays.asList(items != null ? items : new DevItem[0]);
        } catch (RestClientResponseException e) {
            log.warn("[Dev.to] HTTP {} fetching articles for user {}: {}",
                    e.getStatusCode(), username, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Dev.to] Error fetching articles for user {}: {}", username, e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── 内部処理 ──────────────────────────────────────────────────

    /**
     * Parses a keyword string into Dev.to tag format.
     * Comma/semicolon = tag separator; spaces within a tag are replaced with hyphens;
     * everything is lowercased to match Dev.to tag conventions.
     *
     * Examples:
     *   "java"               → ["java"]
     *   "java spring"        → ["java-spring"]   (single hyphenated tag)
     *   "javascript,typescript" → ["javascript", "typescript"]  (two tags, first used for API)
     *   "machine learning"   → ["machine-learning"]
     */
    private List<String> parseTags(String keyword) {
        if (keyword == null || keyword.isBlank()) return List.of();
        return Arrays.stream(keyword.split("[,;]+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT).replaceAll("\\s+", "-"))
                .collect(Collectors.toList());
    }

    /**
     * Fetches up to {@code pages} pages from Dev.to for the given keyword/period.
     * Uses the first parsed tag for the API {@code tag} parameter.
     * Additional tags (comma-separated) are filtered client-side against {@code tag_list}.
     */
    private List<DevItem> fetchSearchPages(String keyword, String period, int pages) {
        List<String> tags = parseTags(keyword);
        String primaryTag = tags.isEmpty() ? null : tags.get(0);
        List<String> additionalTags = tags.size() > 1 ? tags.subList(1, tags.size()) : List.of();
        Integer days = convertPeriodToDays(period);

        Map<String, DevItem> seen = new LinkedHashMap<>();
        for (int page = 1; page <= pages; page++) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL)
                    .queryParam("per_page", 1000)
                    .queryParam("page", page);
            if (primaryTag != null) builder.queryParam("tag", primaryTag);
            if (days != null) builder.queryParam("top", days);

            List<DevItem> items = fetchFromDev(builder.build().toUri());
            if (items.isEmpty()) break;
            for (DevItem item : items) {
                if (item.getId() != null) seen.putIfAbsent(item.getId(), item);
            }
        }

        List<DevItem> result = new ArrayList<>(seen.values());
        // Client-side filter: keep only items that have ALL additional tags
        if (!additionalTags.isEmpty()) {
            result = result.stream()
                    .filter(item -> item.getTagList() != null
                            && additionalTags.stream().allMatch(t -> item.getTagList().contains(t)))
                    .collect(Collectors.toList());
        }
        return result;
    }

    private List<DevItem> fetchAndCache(String period) {
        DevProperties.Period cfg = devProperties.getPeriod(period);
        Integer days = convertPeriodToDays(period);

        log.info("[Dev.to] Fetching {} pages for period='{}' (minReactions={})",
                cfg.getPages(), period, cfg.getMinReactions());

        Map<String, DevItem> seen = new LinkedHashMap<>();
        for (int page = 1; page <= cfg.getPages(); page++) {
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL)
                    .queryParam("per_page", 500)
                    .queryParam("page", page);
            if (days != null) builder.queryParam("top", days);

            List<DevItem> pageItems = fetchFromDev(builder.build().toUri());
            if (pageItems.isEmpty()) break;
            for (DevItem item : pageItems) {
                if (item.getId() != null) seen.putIfAbsent(item.getId(), item);
            }
        }

        List<DevItem> result = new ArrayList<>(seen.values()).stream()
                .filter(a -> getReactions(a) >= cfg.getMinReactions())
                .sorted(Comparator.comparingInt(this::getReactions).reversed())
                .toList();

        log.info("[Dev.to] Cached {} items for period='{}'", result.size(), period);
        hotCache.put(period, new CacheEntry(result, cfg.getTtlSeconds()));
        return result;
    }

    private int getReactions(DevItem item) {
        return item.getLikesCount() != null ? item.getLikesCount() : 0;
    }

    private List<DevItem> fetchFromDev(URI uri) {
        log.debug("[Dev.to] GET {}", uri);
        try {
            DevItem[] items = restClient.get().uri(uri).retrieve().body(DevItem[].class);
            int count = items != null ? items.length : 0;
            log.debug("[Dev.to] Received {} items from {}", count, uri);
            return new ArrayList<>(Arrays.asList(items != null ? items : new DevItem[0]));
        } catch (RestClientResponseException e) {
            log.warn("[Dev.to] HTTP {} for {}: {}",
                    e.getStatusCode(), uri, e.getResponseBodyAsString(StandardCharsets.UTF_8));
            return Collections.emptyList();
        } catch (Exception e) {
            log.error("[Dev.to] Fetch error for {}: {}", uri, e.getMessage());
            return Collections.emptyList();
        }
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
