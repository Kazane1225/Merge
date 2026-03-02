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
        DevItem item = devItem("1", "Java testing guide");
        when(devService.searchArticles("java", "rel", "all")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("1"))
                .andExpect(jsonPath("$[0].title").value("Java testing guide"));

        verify(devService).searchArticles("java", "rel", "all");
    }

    @Test
    void searchArticles_withDefaultSortAndPeriod_usesDefaults() throws Exception {
        when(devService.searchArticles("spring", "rel", "all")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "spring"))
                .andExpect(status().isOk());

        verify(devService).searchArticles("spring", "rel", "all");
    }

    @Test
    void searchArticles_withSortCount_passesCorrectParams() throws Exception {
        when(devService.searchArticles("react", "count", "month")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "react")
                        .param("sort", "count")
                        .param("period", "month"))
                .andExpect(status().isOk());

        verify(devService).searchArticles("react", "count", "month");
    }

    @Test
    void searchArticles_returnsEmptyListWhenNoResults() throws Exception {
        when(devService.searchArticles("noresult", "rel", "all")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/search")
                        .param("keyword", "noresult"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/dev/hot ─────────────────────────────────────────

    @Test
    void getHotArticles_withDefaultPeriod_returnsItems() throws Exception {
        DevItem item = devItem("2", "Hot Dev Article");
        when(devService.getHotArticles("all")).thenReturn(List.of(item));

        mockMvc.perform(get("/api/dev/hot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Hot Dev Article"));

        verify(devService).getHotArticles("all");
    }

    @Test
    void getHotArticles_withPeriodWeek_passesCorrectPeriod() throws Exception {
        when(devService.getHotArticles("week")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/hot")
                        .param("period", "week"))
                .andExpect(status().isOk());

        verify(devService).getHotArticles("week");
    }

    // ─── GET /api/dev/timeline ────────────────────────────────────

    @Test
    void getTimelineArticles_returnsLatestItems() throws Exception {
        DevItem item = devItem("3", "Timeline Article");
        when(devService.getTimelineArticles()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/dev/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Timeline Article"));

        verify(devService).getTimelineArticles();
    }

    @Test
    void getTimelineArticles_returnsEmptyListWhenNoArticles() throws Exception {
        when(devService.getTimelineArticles()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/timeline"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── GET /api/dev/article/{id} ────────────────────────────────

    @Test
    void getArticleDetail_returnsItemById() throws Exception {
        DevItem item = devItem("42", "Detail Article");
        when(devService.getArticleDetail("42")).thenReturn(item);

        mockMvc.perform(get("/api/dev/article/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("42"))
                .andExpect(jsonPath("$.title").value("Detail Article"));

        verify(devService).getArticleDetail("42");
    }

    @Test
    void getArticleDetail_withStringId_passesIdCorrectly() throws Exception {
        DevItem item = devItem("abc-123", "Slug Article");
        when(devService.getArticleDetail("abc-123")).thenReturn(item);

        mockMvc.perform(get("/api/dev/article/abc-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("abc-123"));
    }

    // ─── GET /api/dev/article/{id}/comments ───────────────────────

    @Test
    void getArticleComments_returnsCommentList() throws Exception {
        DevCommentItem comment = new DevCommentItem();
        comment.setId("c1");
        comment.setBody("Great article!");
        when(devService.getArticleComments("42")).thenReturn(List.of(comment));

        mockMvc.perform(get("/api/dev/article/42/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("c1"))
                .andExpect(jsonPath("$[0].body").value("Great article!"));

        verify(devService).getArticleComments("42");
    }

    @Test
    void getArticleComments_returnsEmptyListWhenNoComments() throws Exception {
        when(devService.getArticleComments("99")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/dev/article/99/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ─── ヘルパー ─────────────────────────────────────────────────

    private DevItem devItem(String id, String title) {
        DevItem item = new DevItem();
        item.setId(id);
        item.setTitle(title);
        return item;
    }
}
