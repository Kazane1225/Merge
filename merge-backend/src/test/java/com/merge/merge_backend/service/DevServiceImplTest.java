package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Unit tests for DevServiceImpl.
 * RestTemplate is injected via constructor and replaced with a mock;
 * all logic is verified through public methods without reflection.
 */
@ExtendWith(MockitoExtension.class)
class DevServiceImplTest {

    @Mock
    private RestTemplate restTemplate;

    private DevServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new DevServiceImpl(restTemplate);
    }

    // --- keyword (tag param) ---

    @Test
    void searchArticles_withSingleKeyword_uriContainsExactTag() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "all");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("tag=java");
    }

    @Test
    void searchArticles_withMultipleKeywords_uriContainsOnlyFirstTag() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java spring", "rel", "all");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("tag=java");
        assertThat(cap.getValue().getQuery()).doesNotContain("spring");
    }

    @Test
    void searchArticles_withMultipleKeywordsLeadingSpaces_uriContainsFirstNonEmptyTag() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("  kotlin  coroutines", "rel", "all");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("tag=kotlin");
        assertThat(cap.getValue().getQuery()).doesNotContain("coroutines");
    }

    // --- convertPeriodToDays (verified via top param in URI) ---

    @Test
    void searchArticles_with1dayPeriod_uriContainsTop1() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "1day");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("top=1");
    }

    @Test
    void searchArticles_withWeekPeriod_uriContainsTop7() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "week");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("top=7");
    }

    @Test
    void searchArticles_withMonthPeriod_uriContainsTop30() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "month");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("top=30");
    }

    @Test
    void searchArticles_withYearPeriod_uriContainsTop365() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "year");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("top=365");
    }

    @Test
    void searchArticles_withAllPeriod_uriContainsTop3650() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "all");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).contains("top=3650");
    }

    @Test
    void searchArticles_withUnknownPeriod_uriContainsNoTopParam() throws Exception {
        // privateのモック化
        ArgumentCaptor<URI> cap = uriCaptor();

        // 実行
        service.searchArticles("java", "rel", "unknown");

        // 呼び出し検証
        assertThat(cap.getValue().getQuery()).doesNotContain("top=");
    }

    // --- getReactions (verified via count sort result order) ---

    @Test
    void searchArticles_withCountSort_returnsSortedByLikesDescending() {
        // データ作成
        DevItem low  = devItem("l1", 10);
        DevItem high = devItem("h1", 500);
        // モック化
        mockRestTemplate(low, high);

        // 実行
        List<DevItem> result = service.searchArticles("java", "count", "week");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(500);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
    }

    @Test
    void searchArticles_withNullLikesCount_treatedAsZeroInSort() {
        // データ作成
        DevItem nullLikes = devItem("n1", null);
        DevItem withLikes = devItem("w1", 100);
        // モック化
        mockRestTemplate(nullLikes, withLikes);

        // 実行
        List<DevItem> result = service.searchArticles("java", "count", "week");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(100);
    }

    @Test
    void searchArticles_withZeroLikesCount_treatedAsZero() {
        // データ作成
        DevItem zero = devItem("z1", 0);
        DevItem high = devItem("h1", 50);
        // モック化
        mockRestTemplate(zero, high);

        // 実行
        List<DevItem> result = service.searchArticles("java", "count", "all");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(50);
        assertThat(result.get(1).getLikesCount()).isEqualTo(0);
    }

    @Test
    void searchArticles_withLargeLikesCount_sortedCorrectly() {
        // データ作成
        DevItem big = devItem("b1", 99999);
        DevItem small = devItem("s1", 1);
        // モック化
        mockRestTemplate(big, small);

        // 実行
        List<DevItem> result = service.searchArticles("java", "count", "all");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(99999);
    }

    // --- searchArticles default sort ---

    @Test
    void searchArticles_withRelSort_preservesOriginalOrder() {
        // データ作成
        DevItem first  = devItem("f1", 10);
        DevItem second = devItem("s2", 500);
        // モック化
        mockRestTemplate(first, second);

        // 実行
        List<DevItem> result = service.searchArticles("java", "rel", "week");

        // 検証
        assertThat(result.get(0).getId()).isEqualTo("f1");
    }

    @Test
    void searchArticles_returnsEmptyListWhenApiReturnsEmpty() {
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[0]));

        // 実行
        List<DevItem> result = service.searchArticles("noresult", "rel", "week");

        // 検証
        assertThat(result).isEmpty();
    }

    // --- getArticleDetail ---

    @Test
    void getArticleDetail_returnsItemFromApi() {
        // データ作成
        String json = "{\"id\":\"42\",\"title\":\"Test Article\"}";
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(json));

        // 実行
        DevItem result = service.getArticleDetail("42");

        // 検証
        assertThat(result).isNotNull();
    }

    @Test
    void getArticleDetail_onError_returnsEmptyItem() {
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new RuntimeException("connection error"));

        // 実行
        DevItem result = service.getArticleDetail("bad-id");

        // 検証
        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull();
    }

    // --- getArticleComments ---

    @Test
    void getArticleComments_returnsCommentsFromApi() {
        // データ作成
        DevCommentItem comment = new DevCommentItem();
        comment.setId("c1");
        comment.setBody("Great post!");
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevCommentItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevCommentItem[]{comment}));

        // 実行
        List<DevCommentItem> result = service.getArticleComments("42");

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBody()).isEqualTo("Great post!");
    }

    @Test
    void getArticleComments_onError_returnsEmptyList() {
        // モック化
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevCommentItem[].class)))
                .thenThrow(new RuntimeException("timeout"));

        // 実行
        List<DevCommentItem> result = service.getArticleComments("bad-id");

        // 検証
        assertThat(result).isEmpty();
    }

    // --- helpers ---

    /** Returns items on first call, then empty array on subsequent calls (simulates pagination end). */
    private void mockRestTemplate(DevItem... items) {
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(items))
                .thenReturn(ResponseEntity.ok(new DevItem[0]));
    }

    /** Sets up a mock that captures the URI and returns an empty list, then returns the Captor. */
    private ArgumentCaptor<URI> uriCaptor() {
        ArgumentCaptor<URI> cap = ArgumentCaptor.forClass(URI.class);
        when(restTemplate.exchange(cap.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[0]));
        return cap;
    }

    private DevItem devItem(String id, Integer likesCount) {
        DevItem item = new DevItem();
        item.setId(id);
        item.setLikesCount(likesCount);
        return item;
    }

    // --- getHotArticles ---

    @Test
    void getHotArticles_noArg_delegatesToWeekPeriodAndReturnsItems() {
        // データ作成
        // week: minReactions=5, item with 10 >= 5 → included
        DevItem a = devItem("a1", 10);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[]{a}))
                .thenReturn(ResponseEntity.ok(new DevItem[0]));

        // 実行
        List<DevItem> result = service.getHotArticles();

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("a1");
    }

    @Test
    void getHotArticles_withPeriodOnCacheMiss_fetchesAndReturnsSortedByLikes() {
        // データ作成
        // 1day: minReactions=0, pages=1
        DevItem high = devItem("h1", 200);
        DevItem low  = devItem("l1", 10);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[]{high, low}));

        // 実行
        List<DevItem> result = service.getHotArticles("1day");

        // 検証
        assertThat(result.get(0).getLikesCount()).isEqualTo(200);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
    }

    @Test
    void getHotArticles_onCacheHit_doesNotCallApiAgain() {
        // データ作成
        // 1day: minReactions=0, pages=1
        DevItem a = devItem("a1", 10);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[]{a}));

        // 実行
        service.getHotArticles("1day"); // first call: populates cache

        // lenient guard: if cache is bypassed this would be called and corrupt results
        lenient().when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenThrow(new RuntimeException("should not be called"));

        List<DevItem> cached = service.getHotArticles("1day"); // second call: cache hit

        // 検証
        assertThat(cached).hasSize(1);
        assertThat(cached.get(0).getId()).isEqualTo("a1");
    }

    // --- getTimelineArticles ---

    @Test
    void getTimelineArticles_returnsItemsFromApi() {
        // データ作成
        DevItem a = devItem("tl1", 50);
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenReturn(ResponseEntity.ok(new DevItem[]{a}));

        // 実行
        List<DevItem> result = service.getTimelineArticles();

        // 検証
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("tl1");
    }

    @Test
    void getTimelineArticles_onError_returnsEmptyList() {
        // モック化
        when(restTemplate.exchange(any(URI.class), eq(HttpMethod.GET), any(HttpEntity.class), eq(DevItem[].class)))
                .thenThrow(new RuntimeException("API error"));

        // 実行
        List<DevItem> result = service.getTimelineArticles();

        // 検証
        assertThat(result).isEmpty();
    }
}
