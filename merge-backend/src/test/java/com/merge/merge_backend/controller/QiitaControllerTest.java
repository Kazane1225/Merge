package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import com.merge.merge_backend.service.QiitaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class QiitaControllerTest {

    @Mock
    private QiitaService qiitaService;

    @InjectMocks
    private QiitaController qiitaController;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(qiitaController).build();
    }

    // ─── GET /api/qiita/search ────────────────────────────────────

    @Test
    void searchArticles_withKeyword_delegatesToService() throws Exception {
        QiitaItem item = qiitaItem("abc", "Spring Boot入門");
        when(qiitaService.searchArticles("spring", "rel", "all")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/qiita/search")
                        .param("keyword", "spring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("abc"))
                .andExpect(jsonPath("$[0].title").value("Spring Boot入門"));

        verify(qiitaService).searchArticles("spring", "rel", "all");
    }

    @Test
    void searchArticles_withDefaultSortAndPeriod_usesDefaults() throws Exception {
        when(qiitaService.searchArticles("java", "rel", "all")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/qiita/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk());

        verify(qiitaService).searchArticles("java", "rel", "all");
    }

    @Test
    void searchArticles_withSortCount_passesAllParams() throws Exception {
        when(qiitaService.searchArticles("kotlin", "count", "week")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/qiita/search")
                        .param("keyword", "kotlin")
                        .param("sort", "count")
                        .param("period", "week"))
                .andExpect(status().isOk());

        verify(qiitaService).searchArticles("kotlin", "count", "week");
    }

    @Test
    void searchArticles_returnsLikesCount() throws Exception {
        QiitaItem item = qiitaItem("x1", "人気記事");
        item.setLikesCount(500);
        when(qiitaService.searchArticles("java", "rel", "all")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/qiita/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].likes_count").value(500));
    }

    // ─── GET /api/qiita/hot ───────────────────────────────────────

    @Test
    void getHotArticles_withDefaultPeriod_returnsItems() throws Exception {
        QiitaItem item = qiitaItem("hot1", "ホット記事");
        when(qiitaService.getHotArticles("all")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/qiita/hot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("ホット記事"));

        verify(qiitaService).getHotArticles("all");
    }

    @Test
    void getHotArticles_withPeriodMonth_passesCorrectPeriod() throws Exception {
        when(qiitaService.getHotArticles("month")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/qiita/hot")
                        .param("period", "month"))
                .andExpect(status().isOk());

        verify(qiitaService).getHotArticles("month");
    }

    // ─── GET /api/qiita/timeline ──────────────────────────────────

    @Test
    void getTimelineArticles_returnsLatestItems() throws Exception {
        QiitaItem item = qiitaItem("tl1", "タイムライン記事");
        when(qiitaService.getTimelineArticles()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/qiita/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("タイムライン記事"));

        verify(qiitaService).getTimelineArticles();
    }

    @Test
    void getTimelineArticles_returnsEmptyListWhenNoArticles() throws Exception {
        when(qiitaService.getTimelineArticles()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/qiita/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/qiita/article/{id} ─────────────────────────────

    @Test
    void getArticleDetail_returnsItemById() throws Exception {
        QiitaItem item = qiitaItem("qiita-123", "詳細記事");
        when(qiitaService.getArticleDetail("qiita-123")).thenReturn(item);

        mockMvc.perform(get("/api/qiita/article/qiita-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("qiita-123"))
                .andExpect(jsonPath("$.title").value("詳細記事"));

        verify(qiitaService).getArticleDetail("qiita-123");
    }

    @Test
    void getArticleDetail_withCreatedAt_serializedCorrectly() throws Exception {
        QiitaItem item = qiitaItem("id1", "Date Test");
        item.setCreatedAt("2026-01-15T10:00:00+09:00");
        when(qiitaService.getArticleDetail("id1")).thenReturn(item);

        mockMvc.perform(get("/api/qiita/article/id1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created_at").value("2026-01-15T10:00:00+09:00"));
    }

    // ─── GET /api/qiita/article/{id}/comments ────────────────────

    @Test
    void getArticleComments_returnsCommentList() throws Exception {
        QiitaCommentItem comment = new QiitaCommentItem();
        comment.setId("c1");
        comment.setBody("参考になりました！");
        when(qiitaService.getArticleComments("qiita-123")).thenReturn(List.of(comment));

        mockMvc.perform(get("/api/qiita/article/qiita-123/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("c1"))
                .andExpect(jsonPath("$[0].body").value("参考になりました！"));

        verify(qiitaService).getArticleComments("qiita-123");
    }

    @Test
    void getArticleComments_returnsEmptyListWhenNoComments() throws Exception {
        when(qiitaService.getArticleComments("no-comments")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/qiita/article/no-comments/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── ヘルパー ─────────────────────────────────────────────────

    private QiitaItem qiitaItem(String id, String title) {
        QiitaItem item = new QiitaItem();
        item.setId(id);
        item.setTitle(title);
        return item;
    }
}
