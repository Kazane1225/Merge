package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaCommentItem;
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
import java.util.ArrayList;
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
        StringBuilder baseQueryBuilder = new StringBuilder();
        
        // 1. ベースクエリ構築
        if (keyword != null && !keyword.isEmpty()) {
            baseQueryBuilder.append(keyword);
        }

        if (!"all".equals(period)) {
            LocalDate sinceDate = LocalDate.now();
            if ("week".equals(period)) {
                sinceDate = sinceDate.minusWeeks(1);
            } else if ("month".equals(period)) {
                sinceDate = sinceDate.minusMonths(1);
            }
            
            if (baseQueryBuilder.length() > 0) {
                baseQueryBuilder.append(" ");
            }
            baseQueryBuilder.append("created:>=").append(sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE));
        }

        String baseQuery = baseQueryBuilder.toString();
        List<QiitaItem> items;

        // 2. いいね順 (count) の場合
        if ("count".equals(sort)) {
            // 【STEP 1】まずは厳しめの条件(stocks>=20)で検索
            // 全期間(all)なら殿堂入りクラス(100以上)、それ以外ならトレンド(20以上)を狙う
            int firstThreshold = "all".equals(period) ? 100 : 20;
            String queryHigh = (baseQuery + " stocks:>=" + firstThreshold).trim();
            items = fetchItemsWithQuery(queryHigh);

            // 【STEP 2】件数判定とリトライ
            // 「50件未満」の場合のみ、条件を緩めて再検索する
            // (100件取れた場合はここに入らず、そのままソートに進むのでOK)
            if (items.size() < 50) {
                
                // 1段階緩める (allなら20、その他なら5)
                int secondThreshold = "all".equals(period) ? 20 : 5;
                String queryMid = (baseQuery + " stocks:>=" + secondThreshold).trim();
                List<QiitaItem> retryItems = fetchItemsWithQuery(queryMid);

                // それでも極端に少ない(10件未満)なら、最終手段でフィルタなし
                if (retryItems.size() < 10) {
                    String queryFallback = (baseQuery + " stocks:>=0").trim();
                    items = fetchItemsWithQuery(queryFallback);
                } else {
                    items = retryItems;
                }
            }

            // 【STEP 3】Java側でソート
            List<QiitaItem> sortedItems = new ArrayList<>(items);
            sortedItems.sort((a, b) -> {
                Integer likesA = a.getLikesCount();
                Integer likesB = b.getLikesCount();
                int countA = likesA != null ? likesA : 0;
                int countB = likesB != null ? likesB : 0;
                return Integer.compare(countB, countA); // 降順
            });
            return sortedItems;
        }

        // 3. 通常検索
        items = fetchItemsWithQuery(baseQuery);
        return items;
    }

    // ヘルパーメソッド
    private List<QiitaItem> fetchItemsWithQuery(String rawQuery) {
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

    @Override
    public List<QiitaItem> getHotArticles() {
        return getHotArticles("all");
    }

    @Override
    public List<QiitaItem> getHotArticles(String period) {
        LocalDate sinceDate;
        String rawQuery;
        // 期間の計算
        if ("1day".equals(period)) {
            sinceDate = LocalDate.now().minusDays(1);
            rawQuery = "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=3";
        } else if ("week".equals(period)) {
            sinceDate = LocalDate.now().minusWeeks(1);
            rawQuery = "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=10";
        } else if ("month".equals(period)) {
            sinceDate = LocalDate.now().minusMonths(1);
            rawQuery = "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=45";
        } else {
            sinceDate = LocalDate.now().minusYears(1);
            rawQuery = "created:>=" + sinceDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + " stocks:>=350";
        }

        try {
            String encodedQuery = URLEncoder.encode(rawQuery, StandardCharsets.UTF_8)
                                            .replace("+", "%20");

            String urlStr = QIITA_API_URL + "?page=1&per_page=100&query=" + encodedQuery;
            List<QiitaItem> items = fetchFromQiita(URI.create(urlStr));

            // 【重要】Java側でソート処理
            // fetchFromQiitaの戻り値がImmutable(変更不可)な可能性があるため、新しいArrayListでラップします
            List<QiitaItem> sortedItems = new ArrayList<>(items);
            
            // likes_count (いいね数) の降順（多い順）に並び替え
            sortedItems.sort((a, b) -> {
                // nullチェックを含めた比較
                Integer likesA = a.getLikesCount();
                Integer likesB = b.getLikesCount();
                int countA = likesA != null ? likesA : 0;
                int countB = likesB != null ? likesB : 0;
                return Integer.compare(countB, countA); // 降順 (B - A)
            });

            return sortedItems;

        } catch (Exception e) {
            logger.severe("Encoding or Sorting error: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<QiitaItem> getTimelineArticles() {
        String urlStr = "https://qiita.com/api/v2/items?page=1&per_page=100";
        return fetchFromQiita(URI.create(urlStr));
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
            QiitaItem item = response.getBody();
            if (item != null) {
                return item;
            }
            logger.warning("No article found for ID: " + itemId);
            return new QiitaItem();
        } catch (Exception e) {
            logger.severe("Error fetching article detail: " + e.getMessage());
            return new QiitaItem();
        }
    }

    @Override
    public List<QiitaCommentItem> getArticleComments(String itemId) {
        String url = QIITA_API_URL + "/" + itemId + "/comments";
        try {
            HttpHeaders headers = new HttpHeaders();
            if (qiitaAccessToken != null && !qiitaAccessToken.isEmpty()) {
                headers.set("Authorization", "Bearer " + qiitaAccessToken);
            }
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<QiitaCommentItem[]> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                entity, 
                QiitaCommentItem[].class
            );
            QiitaCommentItem[] comments = response.getBody();
            return Arrays.asList(comments != null ? comments : new QiitaCommentItem[0]);
        } catch (Exception e) {
            logger.severe("Error fetching article comments: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}