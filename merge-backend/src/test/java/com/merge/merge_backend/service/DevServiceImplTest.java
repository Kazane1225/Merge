package com.merge.merge_backend.service;

import com.merge.merge_backend.config.DevProperties;
import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Unit tests for DevServiceImpl.
 * RestClient is backed by MockRestServiceServer so HTTP calls are intercepted
 * without any real network I/O; all logic is verified through public methods.
 */
class DevServiceImplTest {

    private MockRestServiceServer mockServer;
    private DevServiceImpl service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(builder).build();
        service = new DevServiceImpl(builder.build(), new DevProperties());
    }

    @Test
    void searchArticles_withSingleKeyword_uriContainsExactTag() {
        mockServer.expect(requestTo(containsString("tag=java")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_withSpaceSeparatedKeyword_buildsSingleHyphenatedTag() {
        mockServer.expect(requestTo(containsString("tag=java-spring")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java spring", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_withLeadingAndMultipleSpaces_normalizedToHyphenatedTag() {
        mockServer.expect(requestTo(containsString("tag=kotlin-coroutines")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("  kotlin  coroutines", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_withCommaSeparatedTags_usesFirstTagForApi() {
        mockServer.expect(requestTo(allOf(containsString("tag=javascript"), not(containsString("typescript")))))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("javascript,typescript", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_with1dayPeriod_uriContainsTop1() {
        mockServer.expect(requestTo(containsString("top=1")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "1day");

        mockServer.verify();
    }

    @Test
    void searchArticles_withWeekPeriod_uriContainsTop7() {
        mockServer.expect(requestTo(containsString("top=7")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "week");

        mockServer.verify();
    }

    @Test
    void searchArticles_withMonthPeriod_uriContainsTop30() {
        mockServer.expect(requestTo(containsString("top=30")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "month");

        mockServer.verify();
    }

    @Test
    void searchArticles_withYearPeriod_uriContainsTop365() {
        mockServer.expect(requestTo(containsString("top=365")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "year");

        mockServer.verify();
    }

    @Test
    void searchArticles_withAllPeriod_uriContainsTop3650() {
        mockServer.expect(requestTo(containsString("top=3650")))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "all");

        mockServer.verify();
    }

    @Test
    void searchArticles_withUnknownPeriod_uriContainsNoTopParam() {
        mockServer.expect(requestTo(not(containsString("top="))))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        service.searchArticles("java", "rel", "unknown");

        mockServer.verify();
    }

    @Test
    void searchArticles_withCountSort_returnsSortedByLikesDescending() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(devItemArray("h1", 500, "l1", 10), MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("java", "count", "week");

        assertThat(result.get(0).getLikesCount()).isEqualTo(500);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
        mockServer.verify();
    }

    @Test
    void searchArticles_withNullLikesCount_treatedAsZeroInSort() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(
                        "[{\"id\":\"n1\"},{\"id\":\"w1\",\"positive_reactions_count\":100}]",
                        MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("java", "count", "week");

        assertThat(result.get(0).getLikesCount()).isEqualTo(100);
        mockServer.verify();
    }

    @Test
    void searchArticles_withZeroLikesCount_treatedAsZero() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(devItemArray("z1", 0, "h1", 50), MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("java", "count", "all");

        assertThat(result.get(0).getLikesCount()).isEqualTo(50);
        assertThat(result.get(1).getLikesCount()).isEqualTo(0);
        mockServer.verify();
    }

    @Test
    void searchArticles_withLargeLikesCount_sortedCorrectly() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(devItemArray("b1", 99999, "s1", 1), MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("java", "count", "all");

        assertThat(result.get(0).getLikesCount()).isEqualTo(99999);
        mockServer.verify();
    }

    @Test
    void searchArticles_withRelSort_preservesOriginalOrder() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(devItemArray("f1", 10, "s2", 500), MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("java", "rel", "week");

        assertThat(result.get(0).getId()).isEqualTo("f1");
        mockServer.verify();
    }

    @Test
    void searchArticles_returnsEmptyListWhenApiReturnsEmpty() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.searchArticles("noresult", "rel", "week");

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void getArticleDetail_returnsItemFromApi() {
        mockServer.expect(requestTo(containsString("/articles/42")))
                .andRespond(withSuccess("{\"id\":\"42\",\"title\":\"Test Article\"}", MediaType.APPLICATION_JSON));

        DevItem result = service.getArticleDetail("42");

        assertThat(result.getId()).isEqualTo("42");
        assertThat(result.getTitle()).isEqualTo("Test Article");
        mockServer.verify();
    }

    @Test
    void getArticleDetail_onError_returnsEmptyItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        DevItem result = service.getArticleDetail("bad-id");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull();
        mockServer.verify();
    }

    @Test
    void getArticleComments_returnsCommentsFromApi() {
        mockServer.expect(requestTo(containsString("a_id=42")))
                .andRespond(withSuccess("[{\"id\":\"c1\",\"body\":\"Great post!\"}]", MediaType.APPLICATION_JSON));

        List<DevCommentItem> result = service.getArticleComments("42");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getBody()).isEqualTo("Great post!");
        mockServer.verify();
    }

    @Test
    void getArticleComments_onError_returnsEmptyList() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        List<DevCommentItem> result = service.getArticleComments("bad-id");

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void getHotArticles_noArg_delegatesToWeekPeriodAndReturnsItems() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[{\"id\":\"a1\",\"positive_reactions_count\":10}]", MediaType.APPLICATION_JSON));
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.getHotArticles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("a1");
        mockServer.verify();
    }

    @Test
    void getHotArticles_withPeriodOnCacheMiss_fetchesAndReturnsSortedByLikes() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess(devItemArray("h1", 200, "l1", 10), MediaType.APPLICATION_JSON));

        List<DevItem> result = service.getHotArticles("1day");

        assertThat(result.get(0).getLikesCount()).isEqualTo(200);
        assertThat(result.get(1).getLikesCount()).isEqualTo(10);
        mockServer.verify();
    }

    @Test
    void getHotArticles_onCacheHit_doesNotCallApiAgain() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[{\"id\":\"a1\",\"positive_reactions_count\":10}]", MediaType.APPLICATION_JSON));

        service.getHotArticles("1day");
        List<DevItem> cached = service.getHotArticles("1day");

        assertThat(cached).hasSize(1);
        assertThat(cached.get(0).getId()).isEqualTo("a1");
        mockServer.verify();
    }

    @Test
    void getTimelineArticles_returnsItemsFromApi() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withSuccess("[{\"id\":\"tl1\",\"positive_reactions_count\":50}]", MediaType.APPLICATION_JSON));

        List<DevItem> result = service.getTimelineArticles();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("tl1");
        mockServer.verify();
    }

    @Test
    void getTimelineArticles_onError_returnsEmptyList() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        List<DevItem> result = service.getTimelineArticles();

        assertThat(result).isEmpty();
        mockServer.verify();
    }

    @Test
    void getArticleBySlug_callsCorrectUrlAndReturnsItem() {
        mockServer.expect(requestTo(containsString("/articles/alice/my-article")))
                .andRespond(withSuccess("{\"id\":\"99\",\"title\":\"Slug Article\"}", MediaType.APPLICATION_JSON));

        DevItem result = service.getArticleBySlug("alice", "my-article");

        assertThat(result.getId()).isEqualTo("99");
        assertThat(result.getTitle()).isEqualTo("Slug Article");
        mockServer.verify();
    }

    @Test
    void getArticleBySlug_onError_returnsEmptyItem() {
        mockServer.expect(requestTo(anything()))
                .andRespond(withServerError());

        DevItem result = service.getArticleBySlug("unknown", "not-found");

        assertThat(result).isNotNull();
        assertThat(result.getId()).isNull();
        mockServer.verify();
    }

    private static String devItemArray(Object... idAndLikes) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < idAndLikes.length; i += 2) {
            if (i > 0) sb.append(",");
            sb.append("{\"id\":\"").append(idAndLikes[i]).append("\"");
            if (idAndLikes[i + 1] != null) {
                sb.append(",\"positive_reactions_count\":").append(idAndLikes[i + 1]);
            }
            sb.append("}");
        }
        return sb.append("]").toString();
    }
}