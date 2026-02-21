package com.merge.merge_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class DevItem {

    // IDは数値から文字列への自動変換を有効化
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private String id;
    
    private String title;
    private String url;

    @JsonProperty("body_html")
    private String renderedBody;

    // フロントエンド用
    public String getBodyHtml() { return renderedBody; }

    @JsonProperty("positive_reactions_count")
    private Integer likesCount;

    @JsonProperty("comments_count")
    private Integer commentsCount;

    private String description;

    @JsonProperty("readable_publish_date")
    private String readablePublishDate;
    
    @JsonProperty("published_at")
    private String publishedAt;
    
    @JsonProperty("user")
    private Object user;
    
    @JsonProperty("slug")
    private String slug;
    
    @JsonProperty("cover_image")
    private String coverImage;

    @JsonProperty("dev_comments")
    private List<DevCommentItem> devComments;
}