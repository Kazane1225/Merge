package com.merge.merge_backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class QiitaItem {
    private String id;
    private String title;
    private String url;

    @JsonProperty("rendered_body")
    private String renderedBody;

    @JsonProperty("likes_count")
    private int likesCount;

    @JsonProperty("stocks_count")
    private int stocksCount;

    @JsonProperty("qiita-comments")
    private List<QiitaCommentItem> qiitaComments;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getRenderedBody() { return renderedBody; }
    public void setRenderedBody(String renderedBody) { this.renderedBody = renderedBody; }

    public int getLikesCount() { return likesCount; }
    public void setLikesCount(int likesCount) { this.likesCount = likesCount; }

    public int getStocksCount() { return stocksCount; }
    public void setStocksCount(int stocksCount) { this.stocksCount = stocksCount; }

    public List<QiitaCommentItem> getQiitaComments() { return qiitaComments; }
    public void setQiitaComments(List<QiitaCommentItem> qiitaComments) { this.qiitaComments = qiitaComments; }
}
