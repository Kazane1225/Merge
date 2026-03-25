package com.merge.merge_backend.service;

import com.merge.merge_backend.config.QiitaProperties;
import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.anything;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Unit tests for QiitaServiceImpl.
 * RestClient is backed by MockRestServiceServer; Clock is a fixed instance for date-based tests.
 */
class QiitaServiceImplTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 3, 2);
    private static final Clock FIXED_CLOCK = Clock.fixed(
            TODAY.atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

    private MockRestServiceServer mockServer;
    private QiitaServiceImpl service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        service = new QiitaServiceImpl(builder.build(), new QiitaProperties(), FIXED_CLOCK);
    }

    @Test
    void searchArticles_withAll_returnsAllItemsRegardlessOfDate() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("old", "2020-01-01T00:00:00+09:00", 0,
                                       "recent", TODAY + "T00:00:00+09:00", 0),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles(null, "rel", "all");

        assertThat(result).hasSize(2);
        mockServer.verify();
    }

    @Test
    void searchArticles_withWeek_excludesItemsOlderThanOneWeek() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("r1", "2026-02-25T00:00:00+09:00", 0,
                                       "o1", "2026-02-20T00:00:00+09:00", 0),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("r1");
        mockServer.verify();
    }

    @Test
    void searchArticles_withMonth_excludesItemsOlderThanOneMonth() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("r2", "2026-02-10T00:00:00+09:00", 0,
                                       "o2", "2026-01-15T00:00:00+09:00", 0),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "month");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("r2");
        mockServer.verify();
    }

    @Test
    void searchArticles_with1day_excludesItemsOlderThanOneDay() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("t1", TODAY + "T10:00:00+09:00", 0,
                                       "o3", "2026-02-28T00:00:00+09:00", 0),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "1day");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("t1");
        mockServer.verify();
    }

    @Test
    void searchArticles_withNullCreatedAt_excludesItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"nd\"},{\"id\":\"v1\",\"created_at\":\"" + TODAY + "T00:00:00+09:00\"}]",
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("v1");
        mockServer.verify();
    }

    @Test
    void searchArticles_withMalformedCreatedAtOver10Chars_includesItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"bad\",\"created_at\":\"2026-99-99\"}]",
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("bad");
        mockServer.verify();
    }

    @Test
    void searchArticles_withMalformedCreatedAtUnder10Chars_excludesItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"short\",\"created_at\":\"INVALID\"}]",
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "week");

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void searchArticles_withCountSort_returnsSortedByLikesDescending() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("l1", TODAY + "T00:00:00+09:00", 10,
                                       "h1", TODAY + "T00:00:00+09:00", 500),
                        MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "count", "all");

        assertThat(result.get(0).getLikesCount()).isEqualTo(500);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
        mockServer.verify();
    }

    @Test
    void searchArticles_withRelSort_preservesOriginalOrder() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("f1", TODAY + "T00:00:00+09:00", 100,
                                       "s1", TODAY + "T00:00:00+09:00", 500),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.searchArticles("java", "rel", "all");

        assertThat(result.get(0).getId()).isEqualTo("f1");
        mockServer.verify();
    }

    @Test
    void searchArticles_withKeywordAndAllPeriod_uriContainsKeywordOnly() {
        mockServer.expect(requestTo(anything()))
                .andExpect(r -> {
                    String query = r.getURI().getQuery();
                    assertThat(query).contains("spring");
                    assertThat(query).doesNotContain("created:>=");
                })
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("spring", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_withKeywordAndWeekPeriod_uriContainsDateFilter() {
        mockServer.expect(requestTo(anything()))
                .andExpect(r -> {
                    String query = r.getURI().getQuery();
                    assertThat(query).contains("java");
                    assertThat(query).contains("created:>=2026-02-23");
                })
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "week");

        mockServer.verify();
    }

    @Test
    void searchArticles_withNullKeywordAndMonth_uriContainsOnlyDateFilter() {
        mockServer.expect(requestTo(anything()))
                .andExpect(r -> {
                    String query = r.getURI().getQuery();
                    assertThat(query).contains("created:>=2026-02-02");
                    assertThat(query).doesNotContain("null");
                })
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles(null, "rel", "month");

        mockServer.verify();
    }

    @Test
    void searchArticles_with1dayPeriod_uriContainsTodayMinusOne() {
        mockServer.expect(requestTo(anything()))
                .andExpect(r -> assertThat(r.getURI().getQuery()).contains("created:>=2026-03-01"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles(null, "rel", "1day");

        mockServer.verify();
    }

    @Test
    void searchArticles_withYearPeriod_uriContainsOneYearAgoDate() {
        mockServer.expect(requestTo(anything()))
                .andExpect(r -> assertThat(r.getURI().getQuery()).contains("created:>=2025-03-02"))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("kotlin", "rel", "year");

        mockServer.verify();
    }

    @Test
    void getArticleDetail_returnsItemFromApi() {
        mockServer.expect(requestTo(containsString("/items/id123")))
                .andRespond(withSuccess("{\"id\":\"id123\",\"created_at\":\"" + TODAY + "T00:00:00+09:00\"}", MediaType.APPLICATION_JSON));

        QiitaItem result = service.getArticleDetail("id123");

        assertThat(result.getId()).isEqualTo("id123");
        mockServer.verify();
    }

    @Test
    void getArticleDetail_onError_returnsEmptyItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        QiitaItem result = service.getArticleDetail("bad-id");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull();
        mockServer.verify();
    }

    @Test
    void getArticleComments_returnsCommentsFromApi() {
        mockServer.expect(requestTo(containsString("/id123/comments")))
                .andRespond(withSuccess("[{\"id\":\"c1\",\"body\":\"Nice article!\"}]", MediaType.APPLICATION_JSON));

        List<QiitaCommentItem> result = service.getArticleComments("id123");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBody()).isEqualTo("Nice article!");
        mockServer.verify();
    }

    @Test
    void getArticleComments_onError_returnsEmptyList() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        List<QiitaCommentItem> result = service.getArticleComments("bad-id");

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void getHotArticles_noArg_returnsSortedByLikesDescending() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("low",  TODAY + "T00:00:00+09:00", 5,
                                       "high", TODAY + "T00:00:00+09:00", 999),
                        MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.getHotArticles();

        assertThat(result.get(0).getLikesCount()).isEqualTo(999);
        assertThat(result.get(1).getLikesCount()).isEqualTo(5);
        mockServer.verify();
    }

    @Test
    void getHotArticles_withPeriodOnCacheMiss_fetchesAndReturnsSortedByLikes() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        qiitaItemArray("h1", TODAY + "T00:00:00+09:00", 200,
                                       "l1", TODAY + "T00:00:00+09:00", 50),
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.getHotArticles("1day");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getLikesCount()).isEqualTo(200);
        assertThat(result.get(1).getLikesCount()).isEqualTo(50);
        mockServer.verify();
    }

    @Test
    void getHotArticles_onCacheHit_doesNotCallApiAgain() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"a1\",\"created_at\":\"" + TODAY + "T00:00:00+09:00\",\"likes_count\":10}]",
                        MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.getHotArticles("month");
        List<QiitaItem> cached = service.getHotArticles("month");

        assertThat(cached).hasSize(1);
        assertThat(cached.get(0).getId()).isEqualTo("a1");
        mockServer.verify();
    }

    @Test
    void getTimelineArticles_returnsItemsFromApi() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"tl1\",\"created_at\":\"" + TODAY + "T00:00:00+09:00\"}]",
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.getTimelineArticles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("tl1");
        mockServer.verify();
    }

    @Test
    void getTimelineArticles_onError_returnsEmptyList() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        List<QiitaItem> result = service.getTimelineArticles();

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void getUserArticles_returnsItemsFromApi() {
        mockServer.expect(requestTo(containsString("/someuser/items")))
                .andRespond(withSuccess(
                        "[{\"id\":\"u1\",\"created_at\":\"" + TODAY + "T00:00:00+09:00\"}]",
                        MediaType.APPLICATION_JSON));

        List<QiitaItem> result = service.getUserArticles("someuser");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("u1");
        mockServer.verify();
    }

    @Test
    void getUserArticles_onError_returnsEmptyList() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        List<QiitaItem> result = service.getUserArticles("baduser");

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    private static String qiitaItemArray(Object... args) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < args.length; i += 3) {
            if (i > 0) sb.append(",");
            sb.append("{\"id\":\"").append(args[i]).append("\"")
              .append(",\"created_at\":\"").append(args[i + 1]).append("\"")
              .append(",\"likes_count\":").append(args[i + 2])
              .append("}");
        }
        return sb.append("]").toString();
    }
}