package com.merge.merge_backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DevCommentItem {
    private String id;

    @JsonProperty("id_code")
    private String idCode;

    private String body;

    @JsonProperty("body_html")
    private String bodyHtml;

    @JsonProperty("children")
    private List<DevCommentItem> children;

    @JsonProperty("created_at")
    private String createdAt;

    private Object user;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getIdCode() { return idCode; }
    public void setIdCode(String idCode) { this.idCode = idCode; }

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }

    public String getBodyHtml() { return bodyHtml; }
    public void setBodyHtml(String bodyHtml) { this.bodyHtml = bodyHtml; }

    public List<DevCommentItem> getChildren() { return children; }
    public void setChildren(List<DevCommentItem> children) { this.children = children; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public Object getUser() { return user; }
    public void setUser(Object user) { this.user = user; }
}
