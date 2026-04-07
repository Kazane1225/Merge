package com.merge.merge_backend.dto;

import java.util.List;

public class TranslateRequest {
    private List<String> texts;
    private String targetLang;
    private boolean tagHandling;

    public List<String> getTexts() { return texts; }
    public void setTexts(List<String> texts) { this.texts = texts; }
    public String getTargetLang() { return targetLang; }
    public void setTargetLang(String targetLang) { this.targetLang = targetLang; }
    public boolean isTagHandling() { return tagHandling; }
    public void setTagHandling(boolean tagHandling) { this.tagHandling = tagHandling; }
}
