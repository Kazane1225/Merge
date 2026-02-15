package com.merge.merge_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat;

@JsonIgnoreProperties(ignoreUnknown = true)
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

    // --- Getters and Setters ---

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getRenderedBody() { return renderedBody; }
    public void setRenderedBody(String renderedBody) { this.renderedBody = renderedBody; }

    public Integer getLikesCount() { return likesCount; }
    public void setLikesCount(Integer likesCount) { this.likesCount = likesCount; }

    public Integer getCommentsCount() { return commentsCount; }
    public void setCommentsCount(Integer commentsCount) { this.commentsCount = commentsCount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getReadablePublishDate() { return readablePublishDate; }
    public void setReadablePublishDate(String readablePublishDate) { this.readablePublishDate = readablePublishDate; }
    
    public String getPublishedAt() { return publishedAt; }
    public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
    
    public Object getUser() { return user; }
    public void setUser(Object user) { this.user = user; }
    
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
}