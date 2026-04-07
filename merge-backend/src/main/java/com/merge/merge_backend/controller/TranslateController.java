package com.merge.merge_backend.controller;

import com.merge.merge_backend.dto.TranslateRequest;
import com.merge.merge_backend.dto.TranslateResponse;
import com.merge.merge_backend.service.TranslateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/translate")
public class TranslateController {

    @Autowired
    private TranslateService translateService;

    @PostMapping
    public ResponseEntity<TranslateResponse> translate(@RequestBody TranslateRequest request) {
        if (request.getTexts() == null || request.getTexts().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String targetLang = request.getTargetLang();
        if (!"JA".equalsIgnoreCase(targetLang) && !"EN".equalsIgnoreCase(targetLang)) {
            return ResponseEntity.badRequest().build();
        }
        var translations = translateService.translate(
                request.getTexts(),
                targetLang,
                request.isTagHandling()
        );
        return ResponseEntity.ok(new TranslateResponse(translations));
    }
}
