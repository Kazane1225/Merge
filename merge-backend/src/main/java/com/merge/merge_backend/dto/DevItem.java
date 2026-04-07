package com.merge.merge_backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonFormat;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.deser.std.StdDeserializer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
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

    @JsonAlias("positive_reactions_count")
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

    /**
     * list endpoint: tag_list は配列 ["java","spring"]
     * detail endpoint: tag_list は文字列 "java, spring"
     * どちらも List<String> に変換する
     */
    @JsonDeserialize(using = FlexibleTagListDeserializer.class)
    @JsonProperty("tag_list")
    private List<String> tagList;

    public static class FlexibleTagListDeserializer extends StdDeserializer<List<String>> {
        public FlexibleTagListDeserializer() { super(List.class); }

        @Override
        public List<String> deserialize(JsonParser p, DeserializationContext ctx) {
            if (p.currentToken() == JsonToken.START_ARRAY) {
                List<String> list = new ArrayList<>();
                while (p.nextToken() != JsonToken.END_ARRAY) {
                    list.add(p.getText());
                }
                return list;
            } else {
                // CSV文字列: "java, spring, webdev" → ["java","spring","webdev"]
                String csv = p.getText();
                if (csv == null || csv.isBlank()) return List.of();
                return Arrays.stream(csv.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
        }
    }
}