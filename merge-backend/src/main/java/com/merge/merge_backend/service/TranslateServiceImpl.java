package com.merge.merge_backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class TranslateServiceImpl implements TranslateService {

    private static final String DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";

    @Value("${deepl.api.key}")
    private String apiKey;

    private final HttpClient httpClient;

    private final ObjectMapper mapper = new ObjectMapper();

    public TranslateServiceImpl() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    // テスト用コンストラクタ
    TranslateServiceImpl(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public List<String> translate(List<String> texts, String targetLang, boolean tagHandling) {
        if (texts == null || texts.isEmpty()) return List.of();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("DeepL API key is not configured");
        }

        try {
            ObjectNode body = mapper.createObjectNode();
            ArrayNode textArray = body.putArray("text");
            texts.forEach(textArray::add);
            body.put("target_lang", targetLang.toUpperCase());
            if (tagHandling) {
                body.put("tag_handling", "html");
            }

            String requestBody = mapper.writeValueAsString(body);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(DEEPL_FREE_URL))
                    .header("Authorization", "DeepL-Auth-Key " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new RuntimeException("DeepL API error: HTTP " + response.statusCode() + " - " + response.body());
            }

            JsonNode responseJson = mapper.readTree(response.body());
            JsonNode translations = responseJson.get("translations");

            List<String> results = new ArrayList<>();
            if (translations != null && translations.isArray()) {
                for (JsonNode t : translations) {
                    results.add(t.get("text").asText());
                }
            }
            return results;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Translation request interrupted", e);
        } catch (Exception e) {
            throw new RuntimeException("Translation failed: " + e.getMessage(), e);
        }
    }
}
