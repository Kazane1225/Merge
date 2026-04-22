package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
import com.merge.merge_backend.service.DevService;
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
class DevControllerTest {

    @Mock
    private DevService devService;

    @InjectMocks
    private DevController devController;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(devController).build();
    }

    // ─── GET /api/dev/search ──────────────────────────────────────

    @Test
    void searchArticles_withKeyword_delegatesToService() throws Exception {
        // データ作成
        DevItem item = devItem("1", "Java testing guide");
        // モック化
        when(devService.searchArticles("java", "rel", "all")).thenReturn(List.of(item));

        // 実行
        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("1"))
                .andExpect(jsonPath("$[0].title").value("Java testing guide"));

        // 呼び出し検証
        verify(devService).searchArticles("java", "rel", "all");
    }

    @Test
    void searchArticles_withDefaultSortAndPeriod_usesDefaults() throws Exception {
        // モック化
        when(devService.searchArticles("spring", "rel", "all")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "spring"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(devService).searchArticles("spring", "rel", "all");
    }

    @Test
    void searchArticles_withSortCount_passesCorrectParams() throws Exception {
        // モック化
        when(devService.searchArticles("react", "count", "month")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "react")
                        .param("sort", "count")
                        .param("period", "month"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(devService).searchArticles("react", "count", "month");
    }

    @Test
    void searchArticles_returnsEmptyListWhenNoResults() throws Exception {
        // モック化
        when(devService.searchArticles("noresult", "rel", "all")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "noresult"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/dev/hot ─────────────────────────────────────────

    @Test
    void getHotArticles_withDefaultPeriod_returnsItems() throws Exception {
        // データ作成
        DevItem item = devItem("2", "Hot Dev Article");
        // モック化
        when(devService.getHotArticles("all")).thenReturn(List.of(item));

        // 実行
        mockMvc.perform(get("/api/dev/hot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Hot Dev Article"));

        // 呼び出し検証
        verify(devService).getHotArticles("all");
    }

    @Test
    void getHotArticles_withPeriodWeek_passesCorrectPeriod() throws Exception {
        // モック化
        when(devService.getHotArticles("week")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/hot")
                        .param("period", "week"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(devService).getHotArticles("week");
    }

    // ─── GET /api/dev/timeline ────────────────────────────────────

    @Test
    void getTimelineArticles_returnsLatestItems() throws Exception {
        // データ作成
        DevItem item = devItem("3", "Timeline Article");
        // モック化
        when(devService.getTimelineArticles()).thenReturn(List.of(item));

        // 実行
        mockMvc.perform(get("/api/dev/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Timeline Article"));

        // 呼び出し検証
        verify(devService).getTimelineArticles();
    }

    @Test
    void getTimelineArticles_returnsEmptyListWhenNoArticles() throws Exception {
        // モック化
        when(devService.getTimelineArticles()).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/dev/article/{id} ────────────────────────────────

    @Test
    void getArticleDetail_returnsItemById() throws Exception {
        // データ作成
        DevItem item = devItem("42", "Detail Article");
        // モック化
        when(devService.getArticleDetail("42")).thenReturn(item);

        // 実行
        mockMvc.perform(get("/api/dev/article/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("42"))
                .andExpect(jsonPath("$.title").value("Detail Article"));

        // 呼び出し検証
        verify(devService).getArticleDetail("42");
    }

    @Test
    void getArticleDetail_withStringId_passesIdCorrectly() throws Exception {
        // データ作成
        DevItem item = devItem("abc-123", "Slug Article");
        // モック化
        when(devService.getArticleDetail("abc-123")).thenReturn(item);

        // 実行
        mockMvc.perform(get("/api/dev/article/abc-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("abc-123"));
    }

    // ─── GET /api/dev/article/{id}/comments ───────────────────────

    @Test
    void getArticleComments_returnsCommentList() throws Exception {
        // データ作成
        DevCommentItem comment = new DevCommentItem();
        comment.setId("c1");
        comment.setBody("Great article!");
        // モック化
        when(devService.getArticleComments("42")).thenReturn(List.of(comment));

        // 実行
        mockMvc.perform(get("/api/dev/article/42/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("c1"))
                .andExpect(jsonPath("$[0].body").value("Great article!"));

        // 呼び出し検証
        verify(devService).getArticleComments("42");
    }

    @Test
    void getArticleComments_returnsEmptyListWhenNoComments() throws Exception {
        // モック化
        when(devService.getArticleComments("99")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/dev/article/99/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/dev/article-by-slug/{username}/{slug} ───────────────

    @Test
    void getArticleBySlug_returnsItemByUsernameAndSlug() throws Exception {
        // データ作成
        DevItem item = devItem("99", "Slug Article Title");
        // モック化
        when(devService.getArticleBySlug("alice", "my-article")).thenReturn(item);

        // 実行
        mockMvc.perform(get("/api/dev/article-by-slug/alice/my-article"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("99"))
                .andExpect(jsonPath("$.title").value("Slug Article Title"));

        // 呼び出し検証
        verify(devService).getArticleBySlug("alice", "my-article");
    }

    @Test
    void getArticleBySlug_onError_returnsEmptyItem() throws Exception {
        // モック化：空のDevItemを返す
        when(devService.getArticleBySlug("unknown", "not-found")).thenReturn(new DevItem());

        // 実行：idがnullのアイテムが返る
        mockMvc.perform(get("/api/dev/article-by-slug/unknown/not-found"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").doesNotExist());
    }

    // ─── ヘルパー ─────────────────────────────────────────────────

    private DevItem devItem(String id, String title) {
        DevItem item = new DevItem();
        item.setId(id);
        item.setTitle(title);
        return item;
    }
}
