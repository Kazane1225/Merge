package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaItem;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.logging.Logger;

@Service
public class QiitaServiceImpl implements QiitaService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String QIITA_API_URL = "https://qiita.com/api/v2/items";
    private static final Logger logger = Logger.getLogger(QiitaServiceImpl.class.getName());

    @Override
    public List<QiitaItem> searchArticles(String keyword, String sort, String period) {
        String url = buildSearchUrl(keyword, period);
        logger.info("Qiita request URL: " + url);
        return fetchFromQiita(url);
    }

    @Override
    public List<QiitaItem> getHotArticles() {
        String oneMonthAgo = LocalDate.now().minusMonths(1).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String url = QIITA_API_URL + "?page=1&per_page=10&query=lgtm:>20 created:>=" + oneMonthAgo;
        return fetchFromQiita(url);
    }

    private String buildSearchUrl(String keyword, String period) {
        StringBuilder queryBuilder = new StringBuilder(keyword);

        if (!"all".equals(period)) {
            LocalDate sinceDate = LocalDate.now();
            if ("week".equals(period)) {
                sinceDate = sinceDate.minusWeeks(1);
            } else if ("month".equals(period)) {
                sinceDate = sinceDate.minusMonths(1);
            }
            queryBuilder.append(" created:>=").append(sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        String encodedQuery = java.net.URLEncoder.encode(
            queryBuilder.toString(),
            java.nio.charset.StandardCharsets.UTF_8
        );

        return QIITA_API_URL + "?page=1&per_page=100&query=" + encodedQuery;
    }

    private List<QiitaItem> fetchFromQiita(String url) {
        try {
            QiitaItem[] items = restTemplate.getForObject(url, QiitaItem[].class);
            return Arrays.asList(items != null ? items : new QiitaItem[0]);
        } catch (Exception e) {
            logger.severe("Error fetching from Qiita API: " + e.getMessage());
            e.printStackTrace();
            return Arrays.asList(new QiitaItem[0]);
        }
    }
}
