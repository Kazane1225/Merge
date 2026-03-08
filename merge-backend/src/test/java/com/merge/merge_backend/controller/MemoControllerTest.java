package com.merge.merge_backend.controller;

import com.merge.merge_backend.entity.Article;
import com.merge.merge_backend.entity.Memo;
import com.merge.merge_backend.repository.ArticleRepository;
import com.merge.merge_backend.repository.MemoRepository;
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
class MemoControllerTest {

    @Mock
    private MemoRepository memoRepository;

    @Mock
    private ArticleRepository articleRepository;

    @InjectMocks
    private MemoController memoController;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(memoController).build();
    }

    // --- getAllMemos ---

    @Test
    void getAllMemos_returnsListFromRepository() throws Exception {
        // データ作成
        Memo m = memo(1L, "Test memo");
        // モック化
        when(memoRepository.findAll()).thenReturn(List.of(m));

        // 実行
        mockMvc.perform(get("/api/memos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[0].content").value("Test memo"));
    }

    @Test
    void getAllMemos_returnsEmptyListWhenNoMemos() throws Exception {
        // モック化
        when(memoRepository.findAll()).thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/memos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- getMemosByArticle ---

    @Test
    void getMemosByArticle_returnsMemosByArticleId() throws Exception {
        // データ作成
        Memo m = memo(2L, "Article memo");
        // モック化
        when(memoRepository.findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(10L))
                .thenReturn(List.of(m));

        // 実行
        mockMvc.perform(get("/api/article/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(2L))
                .andExpect(jsonPath("$[0].content").value("Article memo"));

        // 呼び出し検証
        verify(memoRepository).findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(10L);
    }

    @Test
    void getMemosByArticle_returnsEmptyListWhenNoMemos() throws Exception {
        // モック化
        when(memoRepository.findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(99L))
                .thenReturn(Collections.emptyList());

        // 実行
        mockMvc.perform(get("/api/article/99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // --- getMemosByUrl ---

    @Test
    void getMemosByUrl_withExistingArticle_returnsMemos() throws Exception {
        // データ作成
        Article article = article(5L, "https://example.com");
        Memo m = memo(3L, "URL memo");
        // モック化
        when(articleRepository.findByUrl("https://example.com")).thenReturn(article);
        when(memoRepository.findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(5L))
                .thenReturn(List.of(m));

        // 実行
        mockMvc.perform(get("/api/memos/search")
                        .param("url", "https://example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("URL memo"));
    }

    @Test
    void getMemosByUrl_withNonExistentArticle_returnsEmptyList() throws Exception {
        // モック化
        when(articleRepository.findByUrl("https://unknown.com")).thenReturn(null);

        // 実行
        mockMvc.perform(get("/api/memos/search")
                        .param("url", "https://unknown.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        // 呼び出し検証
        verifyNoInteractions(memoRepository);
    }

    // --- createMemo ---
    // Note: Memo.article is @JsonBackReference so it won't be deserialized from JSON.
    // Only the no-article path is testable via HTTP.

    @Test
    void createMemo_withNoArticle_savesMemoDirectly() throws Exception {
        // データ作成
        Memo savedMemo = memo(22L, "standalone memo");
        // モック化
        when(memoRepository.save(any(Memo.class))).thenReturn(savedMemo);

        // 実行
        mockMvc.perform(post("/api/memos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"standalone memo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(22L))
                .andExpect(jsonPath("$.content").value("standalone memo"));

        // 呼び出し検証
        verifyNoInteractions(articleRepository);
        verify(memoRepository).save(any(Memo.class));
    }

    @Test
    void createMemo_returnsPersistedMemoWithId() throws Exception {
        // データ作成
        Memo savedMemo = memo(30L, "persisted memo");
        // モック化
        when(memoRepository.save(any(Memo.class))).thenReturn(savedMemo);

        // 実行
        mockMvc.perform(post("/api/memos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"persisted memo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(30L));
    }

    // --- helper ---

    private Memo memo(Long id, String content) {
        Memo m = new Memo();
        m.setId(id);
        m.setContent(content);
        return m;
    }

    private Article article(Long id, String url) {
        Article a = new Article();
        a.setId(id);
        a.setUrl(url);
        return a;
    }
}