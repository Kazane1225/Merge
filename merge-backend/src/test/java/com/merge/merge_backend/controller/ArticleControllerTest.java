package com.merge.merge_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merge.merge_backend.entity.Article;
import com.merge.merge_backend.service.ArticleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ArticleControllerTest {

    @Mock
    private ArticleService articleService;

    @InjectMocks
    private ArticleController articleController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(articleController).build();
    }

    // --- getAllArticles ---

    @Test
    void getAllArticles_returnsListFromService() throws Exception {
        Article a = article(1L, "Spring Boot", "https://example.com");
        when(articleService.getAllArticles()).thenReturn(List.of(a));

        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].title").value("Spring Boot"));
    }

    @Test
    void getAllArticles_returnsEmptyListWhenNoArticles() throws Exception {
        when(articleService.getAllArticles()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- searchArticles ---

    @Test
    void searchArticles_withKeyword_delegatesToService() throws Exception {
        Article a = article(2L, "Java Tips", "https://java.dev");
        when(articleService.searchArticles("java", "rel", "all")).thenReturn(List.of(a));

        mockMvc.perform(get("/api/articles/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Java Tips"));

        verify(articleService).searchArticles("java", "rel", "all");
    }

    @Test
    void searchArticles_withDefaultParams_usesDefaultSortAndPeriod() throws Exception {
        when(articleService.searchArticles(null, "rel", "all")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/articles/search"))
                .andExpect(status().isOk());

        verify(articleService).searchArticles(null, "rel", "all");
    }

    @Test
    void searchArticles_withAllParams_passesToService() throws Exception {
        when(articleService.searchArticles("spring", "count", "week")).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/articles/search")
                        .param("keyword", "spring")
                        .param("sort", "count")
                        .param("period", "week"))
                .andExpect(status().isOk());

        verify(articleService).searchArticles("spring", "count", "week");
    }

    // --- createArticle ---

    @Test
    void createArticle_savesAndReturnsArticle() throws Exception {
        Article input = article(null, "New Article", "https://new.com");
        Article saved = article(10L, "New Article", "https://new.com");
        when(articleService.createArticle(any(Article.class))).thenReturn(saved);

        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.title").value("New Article"));

        verify(articleService).createArticle(any(Article.class));
    }

    @Test
    void createArticle_withRenderedBody_preservesBody() throws Exception {
        Article input = article(null, "Article", "https://url.com");
        input.setRenderedBody("<p>content</p>");
        Article saved = article(20L, "Article", "https://url.com");
        saved.setRenderedBody("<p>content</p>");
        when(articleService.createArticle(any(Article.class))).thenReturn(saved);

        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rendered_body").value("<p>content</p>"));
    }

    // --- deleteArticle ---

    @Test
    void deleteArticle_delegatesToServiceWithId() throws Exception {
        doNothing().when(articleService).deleteArticle(5L);

        mockMvc.perform(delete("/api/articles/5"))
                .andExpect(status().isOk());

        verify(articleService).deleteArticle(5L);
    }

    @Test
    void deleteArticle_withLargeId_passesCorrectId() throws Exception {
        doNothing().when(articleService).deleteArticle(1000L);

        mockMvc.perform(delete("/api/articles/1000"))
                .andExpect(status().isOk());

        verify(articleService).deleteArticle(1000L);
    }

    // --- helper ---

    private Article article(Long id, String title, String url) {
        Article a = new Article();
        a.setId(id);
        a.setTitle(title);
        a.setUrl(url);
        return a;
    }
}