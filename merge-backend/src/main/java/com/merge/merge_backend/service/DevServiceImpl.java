package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.DevItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
public class DevServiceImpl implements DevService {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String BASE_URL = "https://dev.to/api/articles";
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    @Value("${dev.access.token:}")
    private String devApiKey;

    @Override
    public List<DevItem> searchArticles(String keyword, String sort, String period) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL)
                .queryParam("per_page", 100);

        if (keyword != null && !keyword.isEmpty()) {
            builder.queryParam("tag", keyword);
        }

        if (period != null && !period.equals("all")) {
            Integer days = convertPeriodToDays(period);
            if (days != null) {
                builder.queryParam("top", days);
            }
        }

        return fetchFromDev(builder.build().toUri());
    }

    @Override
    public List<DevItem> getHotArticles() {
        return getHotArticles("week");
    }

    @Override
    public List<DevItem> getHotArticles(String period) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(BASE_URL);

        if ("all".equals(period)) {
            builder.queryParam("per_page", 500);
        } else {
            builder.queryParam("per_page", 100);
            Integer days = convertPeriodToDays(period);
            if (days != null) {
                builder.queryParam("top", days);
            }
        }

        return fetchFromDev(builder.build().toUri());
    }

    @Override
    public List<DevItem> getTimelineArticles() {
        String url = BASE_URL + "/latest?per_page=100";
        return fetchFromDev(URI.create(url));
    }

    @Override
    public DevItem getArticleDetail(String itemId) {
        try {
            String url = BASE_URL + "/" + itemId;
            HttpEntity<String> entity = createEntity();
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String jsonBody = response.getBody();
            
            if (jsonBody == null || jsonBody.isEmpty()) {
                return new DevItem();
            }
            
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(jsonBody, DevItem.class);
        } catch (Exception e) {
            return new DevItem();
        }
    }

    private List<DevItem> fetchFromDev(URI uri) {
        try {
            HttpEntity<String> entity = createEntity();
            ResponseEntity<DevItem[]> response = restTemplate.exchange(uri, HttpMethod.GET, entity, DevItem[].class);
            DevItem[] items = response.getBody();
            return Arrays.asList(items != null ? items : new DevItem[0]);
        } catch (HttpStatusCodeException e) {
            return Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private HttpEntity<String> createEntity() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", USER_AGENT);
        if (devApiKey != null && !devApiKey.isEmpty()) {
            headers.set("api-key", devApiKey);
        }
        return new HttpEntity<>(headers);
    }

    private Integer convertPeriodToDays(String period) {
        return switch (period) {
            case "week" -> 7;
            case "month" -> 30;
            case "year" -> 365;
            default -> null;
        };
    }
}