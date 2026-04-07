package com.merge.merge_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.merge.merge_backend.dto.TranslateRequest;
import com.merge.merge_backend.service.TranslateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class TranslateControllerTest {

    @Mock
    private TranslateService translateService;

    @InjectMocks
    private TranslateController translateController;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(translateController).build();
    }

    // ─── POST /api/translate ──────────────────────────────────────

    @Test
    void translate_toJapanese_returnsTranslatedTexts() throws Exception {
        when(translateService.translate(List.of("Hello World"), "JA", false))
                .thenReturn(List.of("こんにちは世界"));

        TranslateRequest req = buildRequest(List.of("Hello World"), "JA", false);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translations[0]").value("こんにちは世界"));

        verify(translateService).translate(List.of("Hello World"), "JA", false);
    }

    @Test
    void translate_toEnglish_returnsTranslatedTexts() throws Exception {
        when(translateService.translate(List.of("こんにちは"), "EN", true))
                .thenReturn(List.of("Hello"));

        TranslateRequest req = buildRequest(List.of("こんにちは"), "EN", true);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translations[0]").value("Hello"));

        verify(translateService).translate(List.of("こんにちは"), "EN", true);
    }

    @Test
    void translate_multipleTexts_returnsAllTranslations() throws Exception {
        when(translateService.translate(List.of("<h1>Title</h1>", "Comment body"), "JA", true))
                .thenReturn(List.of("<h1>タイトル</h1>", "コメント本文"));

        TranslateRequest req = buildRequest(List.of("<h1>Title</h1>", "Comment body"), "JA", true);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.translations[0]").value("<h1>タイトル</h1>"))
                .andExpect(jsonPath("$.translations[1]").value("コメント本文"));
    }

    @Test
    void translate_emptyTexts_returnsBadRequest() throws Exception {
        TranslateRequest req = buildRequest(List.of(), "JA", false);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(translateService);
    }

    @Test
    void translate_nullTexts_returnsBadRequest() throws Exception {
        TranslateRequest req = buildRequest(null, "JA", false);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(translateService);
    }

    @Test
    void translate_unsupportedLang_returnsBadRequest() throws Exception {
        TranslateRequest req = buildRequest(List.of("Hello"), "FR", false);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(translateService);
    }

    @Test
    void translate_langCaseInsensitive_isAccepted() throws Exception {
        when(translateService.translate(List.of("Hello"), "ja", false))
                .thenReturn(List.of("こんにちは"));

        TranslateRequest req = buildRequest(List.of("Hello"), "ja", false);

        mockMvc.perform(post("/api/translate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        verify(translateService).translate(List.of("Hello"), "ja", false);
    }

    // ─── Helper ──────────────────────────────────────────────────

    private TranslateRequest buildRequest(List<String> texts, String targetLang, boolean tagHandling) {
        TranslateRequest req = new TranslateRequest();
        req.setTexts(texts);
        req.setTargetLang(targetLang);
        req.setTagHandling(tagHandling);
        return req;
    }
}
