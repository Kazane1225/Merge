package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.TranslateRequest;
import com.merge.merge_backend.dto.TranslateResponse;
import com.merge.merge_backend.service.TranslateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/translate")
public class TranslateController {

    @Autowired
    private TranslateService translateService;

    @PostMapping
    public ResponseEntity<?> translate(@RequestBody TranslateRequest request) {
        if (request.getTexts() == null || request.getTexts().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String targetLang = request.getTargetLang();
        if (!"JA".equalsIgnoreCase(targetLang) && !"EN".equalsIgnoreCase(targetLang)) {
            return ResponseEntity.badRequest().build();
        }
        try {
            var translations = translateService.translate(
                    request.getTexts(),
                    targetLang,
                    request.isTagHandling()
            );
            return ResponseEntity.ok(new TranslateResponse(translations));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("456")) {
                return ResponseEntity.status(429)
                        .body(Map.of("error", "quota_exceeded",
                                     "message", "DeepLの翻訳上限に達しました。今月の文字数上限を超えています。"));
            }
            return ResponseEntity.status(503)
                    .body(Map.of("error", "translation_failed",
                                 "message", "翻訳サービスでエラーが発生しました"));
        }
    }
}
