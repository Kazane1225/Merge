package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;

@Service
public class QiitaServiceImpl implements QiitaService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String QIITA_API_URL = "https://qiita.com/api/v2/items";
    private static final Logger logger = Logger.getLogger(QiitaServiceImpl.class.getName());

    @Value("${qiita.access.token:}")
    private String qiitaAccessToken;

    @Override
    public List<QiitaItem> searchArticles(String keyword, String sort, String period) {
        StringBuilder queryBuilder = new StringBuilder();
        
        if (keyword != null && !keyword.isEmpty()) {
            queryBuilder.append(keyword);
        }

        if (!"all".equals(period)) {
            LocalDate sinceDate = LocalDate.now();
            if ("week".equals(period)) {
                sinceDate = sinceDate.minusWeeks(1);
            } else if ("month".equals(period)) {
                sinceDate = sinceDate.minusMonths(1);
            }
            
            if (queryBuilder.length() > 0) {
                queryBuilder.append(" ");
            }
            queryBuilder.append("created:>=").append(sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        try {
            String rawQuery = queryBuilder.toString();
            String encodedQuery = URLEncoder.encode(rawQuery, StandardCharsets.UTF_8)
                                            .replace("+", "%20");

            String urlStr = QIITA_API_URL + "?page=1&per_page=100&query=" + encodedQuery;
            return fetchFromQiita(URI.create(urlStr));

        } catch (Exception e) {
            logger.severe("Encoding error: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<QiitaItem> getHotArticles() {
        return getHotArticles("all");
    }

    @Override
    public List<QiitaItem> getHotArticles(String period) {
        LocalDate sinceDate;

        if ("week".equals(period)) {
            sinceDate = LocalDate.now().minusWeeks(1);
        } else if ("month".equals(period)) {
            sinceDate = LocalDate.now().minusMonths(1);
        } else {
            sinceDate = LocalDate.now().minusYears(1);
        }

        String rawQuery = "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=30";

        try {
            String encodedQuery = URLEncoder.encode(rawQuery, StandardCharsets.UTF_8)
                                            .replace("+", "%20");

            String urlStr = QIITA_API_URL + "?page=1&per_page=100&query=" + encodedQuery;
            return fetchFromQiita(URI.create(urlStr));

        } catch (Exception e) {
            logger.severe("Encoding error: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<QiitaItem> fetchFromQiita(URI uri) {
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }

            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<QiitaItem[]> response = restTemplate.exchange(
                uri, 
                HttpMethod.GET, 
                entity, 
                QiitaItem[].class
            );

            QiitaItem[] items = response.getBody();
            return Arrays.asList(items != null ? items : new QiitaItem[0]);

        } catch (HttpStatusCodeException e) {
            return Collections.emptyList();
        } catch (Exception e) {
            logger.severe("General Error fetching from Qiita API: " + e.getMessage());
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public QiitaItem getArticleDetail(String itemId) {
        String url = QIITA_API_URL + "/" + itemId;
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<QiitaItem> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                entity, 
                QiitaItem.class
            );
            return response.getBody();
        } catch (Exception e) {
            logger.severe("Error fetching article detail: " + e.getMessage());
            return null;
        }
    }
}