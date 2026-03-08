package com.merge.merge_backend.service;

import com.merge.merge_backend.entity.Article;
import com.merge.merge_backend.entity.CommentDev;
import com.merge.merge_backend.entity.CommentQiita;
import com.merge.merge_backend.repository.ArticleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleServiceImplTest {

    @Mock
    private ArticleRepository articleRepository;

    @InjectMocks
    private ArticleServiceImpl articleService;

    // ─── getAllArticles ───────────────────────────────────────────

    @Test
    void getAllArticles_returnsNonDeletedArticles() {
        // データ作成
        Article a1 = article(1L, "Article A", LocalDateTime.now());
        Article a2 = article(2L, "Article B", LocalDateTime.now());
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a1, a2)));

        // 実行
        List<Article> result = articleService.getAllArticles();

        // 検証
        assertThat(result).containsExactly(a1, a2);
        // 呼び出し検証
        verify(articleRepository).findByDeleteFlgFalse();
    }

    @Test
    void getAllArticles_returnsEmptyListWhenNoArticles() {
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(Collections.emptyList());

        // 実行
        List<Article> result = articleService.getAllArticles();

        // 検証
        assertThat(result).isEmpty();
    }

    // ─── searchArticles ───────────────────────────────────────────

    @Test
    void searchArticles_withKeyword_delegatesToKeywordQuery() {
        // データ作成
        Article a = article(1L, "Java Spring", LocalDateTime.now());
        // モック化
        when(articleRepository
                .findByTitleContainingIgnoreCaseOrRenderedBodyContainingIgnoreCaseAndDeleteFlgFalse(
                        "spring", "spring"))
                .thenReturn(new ArrayList<>(List.of(a)));

        // 実行
        List<Article> result = articleService.searchArticles("spring", "rel", "all");

        // 検証
        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withNullKeyword_returnsAllArticles() {
        // データ作成
        Article a = article(1L, "Any", LocalDateTime.now());
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // 検証
        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withEmptyKeyword_returnsAllArticles() {
        // データ作成
        Article a = article(1L, "Any", LocalDateTime.now());
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a)));

        // 実行
        List<Article> result = articleService.searchArticles("", "rel", "all");

        // 検証
        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withPeriodWeek_filtersArticlesOlderThanOneWeek() {
        // データ作成
        Article recent = article(1L, "Recent", LocalDateTime.now().minusDays(3));
        Article old    = article(2L, "Old",    LocalDateTime.now().minusDays(10));
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(recent, old)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "week");

        // 検証
        assertThat(result).containsExactly(recent);
        assertThat(result).doesNotContain(old);
    }

    @Test
    void searchArticles_withPeriodMonth_filtersArticlesOlderThanOneMonth() {
        // データ作成
        Article recent = article(1L, "Recent", LocalDateTime.now().minusDays(15));
        Article old    = article(2L, "Old",    LocalDateTime.now().minusDays(40));
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(recent, old)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "month");

        // 検証
        assertThat(result).containsExactly(recent);
        assertThat(result).doesNotContain(old);
    }

    @Test
    void searchArticles_withPeriodAll_returnsAllArticles() {
        // データ作成
        Article old    = article(1L, "Very Old", LocalDateTime.now().minusYears(5));
        Article recent = article(2L, "Recent",   LocalDateTime.now());
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(old, recent)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // 検証
        assertThat(result).hasSize(2);
    }

    @Test
    void searchArticles_sortsByCreatedAtDescending() {
        // データ作成
        LocalDateTime now = LocalDateTime.now();
        Article older  = article(1L, "Older",  now.minusDays(2));
        Article newer  = article(2L, "Newer",  now.minusDays(1));
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(older, newer)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // 検証
        // 新しい記事が先頭に来ること
        assertThat(result.get(0).getId()).isEqualTo(2L);
        assertThat(result.get(1).getId()).isEqualTo(1L);
    }

    @Test
    void searchArticles_withNullCreatedAt_treatedAsMin() {
        // データ作成
        Article noDate = article(1L, "No date", null);
        Article dated  = article(2L, "Dated",   LocalDateTime.now().minusDays(1));
        // モック化
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(noDate, dated)));

        // 実行
        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // 検証
        // null の記事は末尾に来ること
        assertThat(result.get(result.size() - 1).getId()).isEqualTo(1L);
    }

    // ─── createArticle ────────────────────────────────────────────

    @Test
    void createArticle_savesAndReturnsArticle() {
        // データ作成
        Article input  = article(null, "New Article", null);
        Article saved  = article(10L,  "New Article", LocalDateTime.now());
        // モック化
        when(articleRepository.save(input)).thenReturn(saved);

        // 実行
        Article result = articleService.createArticle(input);

        // 検証
        assertThat(result.getId()).isEqualTo(10L);
        // 呼び出し検証
        verify(articleRepository).save(input);
    }

    @Test
    void createArticle_withQiitaComments_linksCommentsToArticle() {
        // データ作成
        CommentQiita c = new CommentQiita();
        Article input = article(null, "Qiita Article", null);
        input.setComments(new ArrayList<>(List.of(c)));
        Article saved = article(1L, "Qiita Article", LocalDateTime.now());
        // モック化
        when(articleRepository.save(input)).thenReturn(saved);

        // 実行
        articleService.createArticle(input);

        // 検証
        assertThat(c.getArticle()).isSameAs(input);
        // 呼び出し検証
        verify(articleRepository).save(input);
    }

    @Test
    void createArticle_withDevComments_linksDevCommentsToArticle() {
        // データ作成
        CommentDev c = new CommentDev();
        Article input = article(null, "Dev Article", null);
        input.setDevComments(new ArrayList<>(List.of(c)));
        Article saved = article(2L, "Dev Article", LocalDateTime.now());
        // モック化
        when(articleRepository.save(input)).thenReturn(saved);

        // 実行
        articleService.createArticle(input);

        // 検証
        assertThat(c.getArticle()).isSameAs(input);
        // 呼び出し検証
        verify(articleRepository).save(input);
    }

    // ─── deleteArticle ────────────────────────────────────────────

    @Test
    void deleteArticle_setsDeleteFlgTrueAndSaves() {
        // データ作成
        Article existing = article(5L, "To Delete", LocalDateTime.now());
        // モック化
        when(articleRepository.findById(5L)).thenReturn(Optional.of(existing));

        // 実行
        articleService.deleteArticle(5L);

        // 検証
        assertThat(existing.isDeleteFlg()).isTrue();
        // 呼び出し検証
        verify(articleRepository).save(existing);
    }

    @Test
    void deleteArticle_withNonExistentId_doesNothing() {
        // モック化
        when(articleRepository.findById(99L)).thenReturn(Optional.empty());

        // 実行
        articleService.deleteArticle(99L);

        // 呼び出し検証
        verify(articleRepository, never()).save(any());
    }

    // ─── ヘルパー ─────────────────────────────────────────────────

    private Article article(Long id, String title, LocalDateTime createdAt) {
        Article a = new Article();
        a.setId(id);
        a.setTitle(title);
        a.setCreatedAt(createdAt);
        return a;
    }
}
