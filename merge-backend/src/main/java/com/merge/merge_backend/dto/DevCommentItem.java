package com.merge.merge_backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
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
}
