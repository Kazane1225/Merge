package com.merge.merge_backend.service;

import java.util.List;

public interface TranslateService {
    List<String> translate(List<String> texts, String targetLang, boolean tagHandling);
}
