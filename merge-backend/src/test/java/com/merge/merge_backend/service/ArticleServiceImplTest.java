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
        Article a1 = article(1L, "Article A", LocalDateTime.now());
        Article a2 = article(2L, "Article B", LocalDateTime.now());
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a1, a2)));

        List<Article> result = articleService.getAllArticles();

        assertThat(result).containsExactly(a1, a2);
        verify(articleRepository).findByDeleteFlgFalse();
    }

    @Test
    void getAllArticles_returnsEmptyListWhenNoArticles() {
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(Collections.emptyList());

        List<Article> result = articleService.getAllArticles();

        assertThat(result).isEmpty();
    }

    // ─── searchArticles ───────────────────────────────────────────

    @Test
    void searchArticles_withKeyword_delegatesToKeywordQuery() {
        Article a = article(1L, "Java Spring", LocalDateTime.now());
        when(articleRepository
                .findByTitleContainingIgnoreCaseOrRenderedBodyContainingIgnoreCaseAndDeleteFlgFalse(
                        "spring", "spring"))
                .thenReturn(new ArrayList<>(List.of(a)));

        List<Article> result = articleService.searchArticles("spring", "rel", "all");

        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withNullKeyword_returnsAllArticles() {
        Article a = article(1L, "Any", LocalDateTime.now());
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a)));

        List<Article> result = articleService.searchArticles(null, "rel", "all");

        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withEmptyKeyword_returnsAllArticles() {
        Article a = article(1L, "Any", LocalDateTime.now());
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(a)));

        List<Article> result = articleService.searchArticles("", "rel", "all");

        assertThat(result).containsExactly(a);
    }

    @Test
    void searchArticles_withPeriodWeek_filtersArticlesOlderThanOneWeek() {
        Article recent = article(1L, "Recent", LocalDateTime.now().minusDays(3));
        Article old    = article(2L, "Old",    LocalDateTime.now().minusDays(10));
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(recent, old)));

        List<Article> result = articleService.searchArticles(null, "rel", "week");

        assertThat(result).containsExactly(recent);
        assertThat(result).doesNotContain(old);
    }

    @Test
    void searchArticles_withPeriodMonth_filtersArticlesOlderThanOneMonth() {
        Article recent = article(1L, "Recent", LocalDateTime.now().minusDays(15));
        Article old    = article(2L, "Old",    LocalDateTime.now().minusDays(40));
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(recent, old)));

        List<Article> result = articleService.searchArticles(null, "rel", "month");

        assertThat(result).containsExactly(recent);
        assertThat(result).doesNotContain(old);
    }

    @Test
    void searchArticles_withPeriodAll_returnsAllArticles() {
        Article old    = article(1L, "Very Old", LocalDateTime.now().minusYears(5));
        Article recent = article(2L, "Recent",   LocalDateTime.now());
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(old, recent)));

        List<Article> result = articleService.searchArticles(null, "rel", "all");

        assertThat(result).hasSize(2);
    }

    @Test
    void searchArticles_sortsByCreatedAtDescending() {
        LocalDateTime now = LocalDateTime.now();
        Article older  = article(1L, "Older",  now.minusDays(2));
        Article newer  = article(2L, "Newer",  now.minusDays(1));
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(older, newer)));

        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // 新しい記事が先頭に来ること
        assertThat(result.get(0).getId()).isEqualTo(2L);
        assertThat(result.get(1).getId()).isEqualTo(1L);
    }

    @Test
    void searchArticles_withNullCreatedAt_treatedAsMin() {
        Article noDate = article(1L, "No date", null);
        Article dated  = article(2L, "Dated",   LocalDateTime.now().minusDays(1));
        when(articleRepository.findByDeleteFlgFalse()).thenReturn(new ArrayList<>(List.of(noDate, dated)));

        List<Article> result = articleService.searchArticles(null, "rel", "all");

        // null の記事は末尾に来ること
        assertThat(result.get(result.size() - 1).getId()).isEqualTo(1L);
    }

    // ─── createArticle ────────────────────────────────────────────

    @Test
    void createArticle_savesAndReturnsArticle() {
        Article input  = article(null, "New Article", null);
        Article saved  = article(10L,  "New Article", LocalDateTime.now());
        when(articleRepository.save(input)).thenReturn(saved);

        Article result = articleService.createArticle(input);

        assertThat(result.getId()).isEqualTo(10L);
        verify(articleRepository).save(input);
    }

    @Test
    void createArticle_withQiitaComments_linksCommentsToArticle() {
        CommentQiita c = new CommentQiita();
        Article input = article(null, "Qiita Article", null);
        input.setComments(new ArrayList<>(List.of(c)));
        Article saved = article(1L, "Qiita Article", LocalDateTime.now());
        when(articleRepository.save(input)).thenReturn(saved);

        articleService.createArticle(input);

        assertThat(c.getArticle()).isSameAs(input);
        verify(articleRepository).save(input);
    }

    @Test
    void createArticle_withDevComments_linksDevCommentsToArticle() {
        CommentDev c = new CommentDev();
        Article input = article(null, "Dev Article", null);
        input.setDevComments(new ArrayList<>(List.of(c)));
        Article saved = article(2L, "Dev Article", LocalDateTime.now());
        when(articleRepository.save(input)).thenReturn(saved);

        articleService.createArticle(input);

        assertThat(c.getArticle()).isSameAs(input);
        verify(articleRepository).save(input);
    }

    // ─── deleteArticle ────────────────────────────────────────────

    @Test
    void deleteArticle_setsDeleteFlgTrueAndSaves() {
        Article existing = article(5L, "To Delete", LocalDateTime.now());
        when(articleRepository.findById(5L)).thenReturn(Optional.of(existing));

        articleService.deleteArticle(5L);

        assertThat(existing.isDeleteFlg()).isTrue();
        verify(articleRepository).save(existing);
    }

    @Test
    void deleteArticle_withNonExistentId_doesNothing() {
        when(articleRepository.findById(99L)).thenReturn(Optional.empty());

        articleService.deleteArticle(99L);

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
