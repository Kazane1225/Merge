package com.merge.merge_backend.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
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
}
