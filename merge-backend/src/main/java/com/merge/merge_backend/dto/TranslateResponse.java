package com.merge.merge_backend.dto;

import java.util.List;

public class TranslateResponse {
    private List<String> translations;

    public TranslateResponse(List<String> translations) {
        this.translations = translations;
    }

    public List<String> getTranslations() { return translations; }
    public void setTranslations(List<String> translations) { this.translations = translations; }
}
