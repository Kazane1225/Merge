package com.merge.merge_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merge.merge_backend.entity.Article;
import com.merge.merge_backend.repository.ArticleRepository;
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

    @Mock
    private ArticleRepository articleRepository;

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
        // データ作成
        Article a = article(1L, "Spring Boot", "https://example.com");
        // モック化
        when(articleService.getAllArticles()).thenReturn(List.of(a));

        // 実行
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].title").value("Spring Boot"));
    }

    @Test
    void getAllArticles_returnsEmptyListWhenNoArticles() throws Exception {
        // モック化
        when(articleService.getAllArticles()).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- searchArticles ---

    @Test
    void searchArticles_withKeyword_delegatesToService() throws Exception {
        // データ作成
        Article a = article(2L, "Java Tips", "https://java.dev");
        // モック化
        when(articleService.searchArticles("java", "rel", "all")).thenReturn(List.of(a));

        // 実行
        mockMvc.perform(get("/api/articles/search")
                        .param("keyword", "java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Java Tips"));

        // 呼び出し検証
        verify(articleService).searchArticles("java", "rel", "all");
    }

    @Test
    void searchArticles_withDefaultParams_usesDefaultSortAndPeriod() throws Exception {
        // モック化
        when(articleService.searchArticles(null, "rel", "all")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/articles/search"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(articleService).searchArticles(null, "rel", "all");
    }

    @Test
    void searchArticles_withAllParams_passesToService() throws Exception {
        // モック化
        when(articleService.searchArticles("spring", "count", "week")).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/articles/search")
                        .param("keyword", "spring")
                        .param("sort", "count")
                        .param("period", "week"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(articleService).searchArticles("spring", "count", "week");
    }

    // --- createArticle ---

    @Test
    void createArticle_savesAndReturnsArticle() throws Exception {
        // データ作成
        Article input = article(null, "New Article", "https://new.com");
        Article saved = article(10L, "New Article", "https://new.com");
        // モック化
        when(articleService.createArticle(any(Article.class))).thenReturn(saved);

        // 実行
        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10L))
                .andExpect(jsonPath("$.title").value("New Article"));

        // 呼び出し検証
        verify(articleService).createArticle(any(Article.class));
    }

    @Test
    void createArticle_withRenderedBody_preservesBody() throws Exception {
        // データ作成
        Article input = article(null, "Article", "https://url.com");
        input.setRenderedBody("<p>content</p>");
        Article saved = article(20L, "Article", "https://url.com");
        saved.setRenderedBody("<p>content</p>");
        // モック化
        when(articleService.createArticle(any(Article.class))).thenReturn(saved);

        // 実行
        mockMvc.perform(post("/api/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rendered_body").value("<p>content</p>"));
    }

    // --- deleteArticle ---

    @Test
    void deleteArticle_delegatesToServiceWithId() throws Exception {
        // モック化
        doNothing().when(articleService).deleteArticle(5L);

        // 実行
        mockMvc.perform(delete("/api/articles/5"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(articleService).deleteArticle(5L);
    }

    @Test
    void deleteArticle_withLargeId_passesCorrectId() throws Exception {
        // モック化
        doNothing().when(articleService).deleteArticle(1000L);

        // 実行
        mockMvc.perform(delete("/api/articles/1000"))
                .andExpect(status().isOk());

        // 呼び出し検証
        verify(articleService).deleteArticle(1000L);
    }

    // --- getArticleByUrl ---

    @Test
    void getArticleByUrl_withExistingUrl_returns200WithArticle() throws Exception {
        // データ作成
        Article a = article(5L, "Saved Article", "https://saved.com");
        // モック化
        when(articleRepository.findByUrl("https://saved.com")).thenReturn(a);

        // 実行
        mockMvc.perform(get("/api/articles/by-url")
                        .param("url", "https://saved.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(5L))
                .andExpect(jsonPath("$.title").value("Saved Article"));
    }

    @Test
    void getArticleByUrl_withNonExistentUrl_returns404() throws Exception {
        // モック化
        when(articleRepository.findByUrl("https://missing.com")).thenReturn(null);

        // 実行
        mockMvc.perform(get("/api/articles/by-url")
                        .param("url", "https://missing.com"))
                .andExpect(status().isNotFound());
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