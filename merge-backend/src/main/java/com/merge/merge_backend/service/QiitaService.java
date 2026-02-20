package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.QiitaCommentItem;
import com.merge.merge_backend.dto.QiitaItem;
import java.util.List;

public interface QiitaService {
    List<QiitaItem> searchArticles(String keyword, String sort, String period);
    List<QiitaItem> getHotArticles();
    List<QiitaItem> getHotArticles(String period);
    List<QiitaItem> getTimelineArticles();
    QiitaItem getArticleDetail(String itemId);
    List<QiitaCommentItem> getArticleComments(String itemId);
}
