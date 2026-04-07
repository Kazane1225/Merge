package com.merge.merge_backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for TranslateServiceImpl.
 * HttpClient は Mockito でモック化し、DeepL API を呼び出さずにテストする。
 */
@ExtendWith(MockitoExtension.class)
class TranslateServiceImplTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    @SuppressWarnings("rawtypes")
    private HttpResponse httpResponse;

    private TranslateServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new TranslateServiceImpl(httpClient);
        ReflectionTestUtils.setField(service, "apiKey", "test-api-key");
    }

    // ─── 正常系 ──────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void translate_singleText_returnsTranslatedText() throws Exception {
        String deeplResponse = """
                {"translations":[{"detected_source_language":"EN","text":"こんにちは世界"}]}
                """;
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(deeplResponse);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(httpResponse);

        List<String> result = service.translate(List.of("Hello World"), "JA", false);

        assertThat(result).containsExactly("こんにちは世界");
    }

    @Test
    @SuppressWarnings("unchecked")
    void translate_multipleTexts_returnsAllTranslations() throws Exception {
        String deeplResponse = """
                {"translations":[
                  {"detected_source_language":"EN","text":"<h1>タイトル</h1>"},
                  {"detected_source_language":"EN","text":"コメント本文"}
                ]}
                """;
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(deeplResponse);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(httpResponse);

        List<String> result = service.translate(List.of("<h1>Title</h1>", "Comment body"), "JA", true);

        assertThat(result).containsExactly("<h1>タイトル</h1>", "コメント本文");
    }

    @Test
    @SuppressWarnings("unchecked")
    void translate_toEnglish_returnsEnglishText() throws Exception {
        String deeplResponse = """
                {"translations":[{"detected_source_language":"JA","text":"Hello World"}]}
                """;
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(deeplResponse);
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(httpResponse);

        List<String> result = service.translate(List.of("こんにちは世界"), "EN", false);

        assertThat(result).containsExactly("Hello World");
    }

    // ─── 空・null入力 ─────────────────────────────────────────────

    @Test
    void translate_emptyList_returnsEmptyList() {
        List<String> result = service.translate(List.of(), "JA", false);

        assertThat(result).isEmpty();
    }

    @Test
    void translate_nullList_returnsEmptyList() {
        List<String> result = service.translate(null, "JA", false);

        assertThat(result).isEmpty();
    }

    // ─── APIキー未設定 ────────────────────────────────────────────

    @Test
    void translate_blankApiKey_throwsIllegalState() {
        ReflectionTestUtils.setField(service, "apiKey", "");

        assertThatThrownBy(() -> service.translate(List.of("Hello"), "JA", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DeepL API key is not configured");
    }

    @Test
    void translate_nullApiKey_throwsIllegalState() {
        ReflectionTestUtils.setField(service, "apiKey", null);

        assertThatThrownBy(() -> service.translate(List.of("Hello"), "JA", false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DeepL API key is not configured");
    }

    // ─── APIエラー ────────────────────────────────────────────────

    @Test
    @SuppressWarnings("unchecked")
    void translate_deepLReturns429_throwsRuntimeException() throws Exception {
        when(httpResponse.statusCode()).thenReturn(429);
        when(httpResponse.body()).thenReturn("Too Many Requests");
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(httpResponse);

        assertThatThrownBy(() -> service.translate(List.of("Hello"), "JA", false))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DeepL API error: HTTP 429");
    }

    @Test
    @SuppressWarnings("unchecked")
    void translate_deepLReturns456_throwsRuntimeException() throws Exception {
        when(httpResponse.statusCode()).thenReturn(456);
        when(httpResponse.body()).thenReturn("Quota Exceeded");
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenReturn(httpResponse);

        assertThatThrownBy(() -> service.translate(List.of("Hello"), "JA", false))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DeepL API error: HTTP 456");
    }

    @Test
    @SuppressWarnings("unchecked")
    void translate_networkError_throwsRuntimeException() throws Exception {
        when(httpClient.send(any(HttpRequest.class), eq(HttpResponse.BodyHandlers.ofString())))
                .thenThrow(new java.io.IOException("Network unreachable"));

        assertThatThrownBy(() -> service.translate(List.of("Hello"), "JA", false))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Translation failed");
    }
}
