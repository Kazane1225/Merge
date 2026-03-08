package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests for QiitaServiceImpl.
 * RestTemplate and Clock are injected via constructor and replaced with mocks;
 * all logic is verified through public methods without reflection.
 */
@ExtendWith(MockitoExtension.class)
class QiitaServiceImplTest {

    // Fixed clock: 2026-03-02
    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);
    private static final Clock FIXED_CLOCK = Clock.fixed(
            TODAY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    @Mock
    private RestTemplate restTemplate;

    private QiitaServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new QiitaServiceImpl(restTemplate, FIXED_CLOCK);
    }

    // --- filterByPeriod (verified via searchArticles) ---

    @Test
    void searchArticles_withAll_returnsAllItemsRegardlessOfDate() {
        // データ作成
        QiitaItem old    = item("old",    "2020-01-01T00:00:00+09:00");
        QiitaItem recent = item("recent", TODAY + "T00:00:00+09:00");
        // モック化
        mockRestTemplate(old, recent);

        // 実行
        List<QiitaItem> result = service.searchArticles(null, "rel", "all");

        // 検証
        assertThat(result).containsExactlyInAnyOrder(old, recent);
    }

    @Test
    void searchArticles_withWeek_excludesItemsOlderThanOneWeek() {
        // データ作成
        // week -> sinceDate = 2026-02-23
        QiitaItem inRange  = item("r1", "2026-02-25T00:00:00+09:00");  // 5 days ago -> included
        QiitaItem outRange = item("o1", "2026-02-20T00:00:00+09:00");  // 10 days ago -> excluded
        // モック化
        mockRestTemplate(inRange, outRange);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        // 検証
        assertThat(result).containsExactly(inRange);
        assertThat(result).doesNotContain(outRange);
    }

    @Test
    void searchArticles_withMonth_excludesItemsOlderThanOneMonth() {
        // データ作成
        // month -> sinceDate = 2026-02-02
        QiitaItem inRange  = item("r2", "2026-02-10T00:00:00+09:00");
        QiitaItem outRange = item("o2", "2026-01-15T00:00:00+09:00");
        // モック化
        mockRestTemplate(inRange, outRange);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "month");

        // 検証
        assertThat(result).containsExactly(inRange);
    }

    @Test
    void searchArticles_with1day_excludesItemsOlderThanOneDay() {
        // データ作成
        // 1day -> sinceDate = 2026-03-01
        QiitaItem today  = item("t1", TODAY + "T10:00:00+09:00");
        QiitaItem twoAgo = item("o3", "2026-02-28T00:00:00+09:00");
        // モック化
        mockRestTemplate(today, twoAgo);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "1day");

        // 検証
        assertThat(result).containsExactly(today);
    }

    @Test
    void searchArticles_withNullCreatedAt_excludesItem() {
        // データ作成
        QiitaItem noDate = new QiitaItem();
        noDate.setId("nd");
        QiitaItem valid = item("v1", TODAY + "T00:00:00+09:00");
        // モック化
        mockRestTemplate(noDate, valid);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        // 検証
        assertThat(result).containsExactly(valid);
    }

    @Test
    void searchArticles_withMalformedCreatedAtOver10Chars_includesItem() {
        // データ作成
        // 10+ chars but unparseable -> catch(Exception) -> true, item included
        QiitaItem bad = new QiitaItem();
        bad.setId("bad");
        bad.setCreatedAt("2026-99-99");
        // モック化
        mockRestTemplate(bad);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        // 検証
        assertThat(result).contains(bad);
    }

    @Test
    void searchArticles_withMalformedCreatedAtUnder10Chars_excludesItem() {
        // データ作成
        // under 10 chars -> immediately false, item excluded
        QiitaItem bad = new QiitaItem();
        bad.setId("short");
        bad.setCreatedAt("INVALID");
        // モック化
        mockRestTemplate(bad);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        // 検証
        assertThat(result).doesNotContain(bad);
    }

    // --- searchArticles sort ---

    @Test
    void searchArticles_withCountSort_returnsSortedByLikesDescending() {
        // データ作成
        QiitaItem low  = item("l1", TODAY + "T00:00:00+09:00", 10);
        QiitaItem high = item("h1", TODAY + "T00:00:00+09:00", 500);
        // モック化
        mockRestTemplate(low, high);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "count", "all");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(500);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
    }

    @Test
    void searchArticles_withRelSort_preservesOriginalOrder() {
        // データ作成
        QiitaItem first  = item("f1", TODAY + "T00:00:00+09:00", 100);
        QiitaItem second = item("s1", TODAY + "T00:00:00+09:00", 500);
        // モック化
        mockRestTemplate(first, second);

        // 実行
        List<QiitaItem> result = service.searchArticles("java", "rel", "all");

        // 検証
        assertThat(result.get(0)).isEqualTo(first);
    }

    // --- buildSearchQuery + sinceDate (verified via URI capture) ---

    @Test
    void searchArticles_withKeywordAndAllPeriod_uriContainsKeywordOnly() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("spring", "rel", "all");

        // 呼び出し検証
        String decoded = URLDecoder.decode(cap.getValue().getQuery(), StandardCharsets.UTF_8);
        assertThat(decoded).contains("spring");
        assertThat(decoded).doesNotContain("created:>=");
    }

    @Test
    void searchArticles_withKeywordAndWeekPeriod_uriContainsDateFilter() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "week");

        // 呼び出し検証
        // 2026-03-02 - 1 week = 2026-02-23
        String decoded = URLDecoder.decode(cap.getValue().getQuery(), StandardCharsets.UTF_8);
        assertThat(decoded).contains("java");
        assertThat(decoded).contains("created:>=2026-02-23");
    }

    @Test
    void searchArticles_withNullKeywordAndMonth_uriContainsOnlyDateFilter() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles(null, "rel", "month");

        // 呼び出し検証
        // 2026-03-02 - 1 month = 2026-02-02
        String decoded = URLDecoder.decode(cap.getValue().getQuery(), StandardCharsets.UTF_8);
        assertThat(decoded).contains("created:>=2026-02-02");
        assertThat(decoded).doesNotContain("null");
    }

    @Test
    void searchArticles_with1dayPeriod_uriContainsTodayMinusOne() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles(null, "rel", "1day");

        // 呼び出し検証
        // 2026-03-02 - 1 day = 2026-03-01
        String decoded = URLDecoder.decode(cap.getValue().getQuery(), StandardCharsets.UTF_8);
        assertThat(decoded).contains("created:>=2026-03-01");
    }

    @Test
    void searchArticles_withYearPeriod_uriContainsOneYearAgoDate() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("kotlin", "rel", "year");

        // 呼び出し検証
        // 2026-03-02 - 1 year = 2025-03-02
        String decoded = URLDecoder.decode(cap.getValue().getQuery(), StandardCharsets.UTF_8);
        assertThat(decoded).contains("created:>=2025-03-02");
    }

    // --- getArticleDetail ---

    @Test
    void getArticleDetail_returnsItemFromApi() {
        // データ作成
        QiitaItem expected = item("id123", TODAY + "T00:00:00+09:00");
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem.class)))
                .thenReturn(ResponseEntity.ok(expected));

        // 実行
        QiitaItem result = service.getArticleDetail("id123");

        // 検証
        assertThat(result.getId()).isEqualTo("id123");
    }

    @Test
    void getArticleDetail_onError_returnsEmptyItem() {
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem.class)))
                .thenThrow(new RuntimeException("connection error"));

        // 実行
        QiitaItem result = service.getArticleDetail("bad-id");

        // 検証
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull();
    }

    // --- getArticleComments ---

    @Test
    void getArticleComments_returnsCommentsFromApi() {
        // データ作成
        QiitaCommentItem comment = new QiitaCommentItem();
        comment.setId("c1");
        comment.setBody("Nice article!");
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaCommentItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaCommentItem[]{comment}));

        // 実行
        List<QiitaCommentItem> result = service.getArticleComments("id123");

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBody()).isEqualTo("Nice article!");
    }

    @Test
    void getArticleComments_onError_returnsEmptyList() {
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaCommentItem[].class)))
                .thenThrow(new RuntimeException("timeout"));

        // 実行
        List<QiitaCommentItem> result = service.getArticleComments("bad-id");

        // 検証
        assertThat(result).isEmpty();
    }

    // --- helpers ---

    /** Returns items on first call, then empty array on subsequent calls (simulates pagination end). */
    private void mockRestTemplate(QiitaItem... items) {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(items))
                .thenReturn(ResponseEntity.ok(new QiitaItem[0]));
    }

    /** Sets up a mock that captures the URI and returns an empty list, then returns the Captor. */
    private ArgumentCaptor<URI> uriCaptor() {
        ArgumentCaptor<URI> cap = ArgumentCaptor.forClass(URI.class);
        when(restTemplate.exchange(cap.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[0]));
        return cap;
    }

    private QiitaItem item(String id, String createdAt) {
        QiitaItem i = new QiitaItem();
        i.setId(id);
        i.setCreatedAt(createdAt);
        return i;
    }

    private QiitaItem item(String id, String createdAt, int likesCount) {
        QiitaItem i = item(id, createdAt);
        i.setLikesCount(likesCount);
        return i;
    }

    // --- getHotArticles ---

    @Test
    void getHotArticles_noArg_returnsSortedByLikesDescending() {
        // データ作成
        QiitaItem low  = item("low",  TODAY + "T00:00:00+09:00", 5);
        QiitaItem high = item("high", TODAY + "T00:00:00+09:00", 999);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[]{low, high}))
                .thenReturn(ResponseEntity.ok(new QiitaItem[0]));

        // 実行
        List<QiitaItem> result = service.getHotArticles();

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(999);
        assertThat(result.get(1).getLikesCount()).isEqualTo(5);
    }

    @Test
    void getHotArticles_withPeriodOnCacheMiss_fetchesAndReturnsSortedByLikes() {
        // データ作成
        QiitaItem high = item("h1", TODAY + "T00:00:00+09:00", 200);
        QiitaItem low  = item("l1", TODAY + "T00:00:00+09:00", 50);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[]{high, low}))
                .thenReturn(ResponseEntity.ok(new QiitaItem[0]));

        // 実行
        List<QiitaItem> result = service.getHotArticles("1day");

        // 検証
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getLikesCount()).isEqualTo(200);
        assertThat(result.get(1).getLikesCount()).isEqualTo(50);
    }

    @Test
    void getHotArticles_onCacheHit_doesNotCallApiAgain() {
        // データ作成
        QiitaItem a = item("a1", TODAY + "T00:00:00+09:00", 10);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[]{a}))
                .thenReturn(ResponseEntity.ok(new QiitaItem[0]));

        // 実行
        service.getHotArticles("month"); // first call: populates cache

        // lenient guard: if cache is bypassed this would be called and corrupt results
        lenient().when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenThrow(new RuntimeException("should not be called"));

        List<QiitaItem> cached = service.getHotArticles("month"); // second call: cache hit

        // 検証
        assertThat(cached).hasSize(1);
        assertThat(cached.get(0).getId()).isEqualTo("a1");
    }

    // --- getTimelineArticles ---

    @Test
    void getTimelineArticles_returnsItemsFromApi() {
        // データ作成
        QiitaItem a = item("tl1", TODAY + "T00:00:00+09:00");
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[]{a}));

        // 実行
        List<QiitaItem> result = service.getTimelineArticles();

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("tl1");
    }

    @Test
    void getTimelineArticles_onError_returnsEmptyList() {
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenThrow(new RuntimeException("API error"));

        // 実行
        List<QiitaItem> result = service.getTimelineArticles();

        // 検証
        assertThat(result).isEmpty();
    }

    // --- getUserArticles ---

    @Test
    void getUserArticles_returnsItemsFromApi() {
        // データ作成
        QiitaItem a = item("u1", TODAY + "T00:00:00+09:00");
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenReturn(ResponseEntity.ok(new QiitaItem[]{a}));

        // 実行
        List<QiitaItem> result = service.getUserArticles("someuser");

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("u1");
    }

    @Test
    void getUserArticles_onError_returnsEmptyList() {
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(QiitaItem[].class)))
                .thenThrow(new RuntimeException("API error"));

        // 実行
        List<QiitaItem> result = service.getUserArticles("baduser");

        // 検証
        assertThat(result).isEmpty();
    }
}
