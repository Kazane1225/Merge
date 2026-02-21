package com.merge.merge_backend.service;

import com.merge.merge_backend.dto.DevCommentItem;
import com.merge.merge_backend.dto.DevItem;
import java.util.List;

public interface DevService {
    List<DevItem> searchArticles(String keyword, String sort, String period);
    List<DevItem> getHotArticles();
    List<DevItem> getHotArticles(String period);
    List<DevItem> getTimelineArticles();
    DevItem getArticleDetail(String itemId);
    List<DevCommentItem> getArticleComments(String itemId);
}
