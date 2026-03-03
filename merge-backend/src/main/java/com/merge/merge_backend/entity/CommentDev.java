package com.merge.merge_backend.entity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Transient;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.Getter;

@Entity
@Data
@EqualsAndHashCode(callSuper=false)
public class CommentDev extends BaseEntity {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "article_id")
    private Article article;

    // Dev.to の id_code (React key に利用)
    @Column
    @JsonProperty("id_code")
    private String idCode;

    @Column(columnDefinition = "TEXT")
    @JsonProperty("body_html")
    private String bodyHtml;

    // user.name (Dev.to display name)
    @Column
    private String userName;

    // user.profile_image or user.profile_image_90
    @Column(columnDefinition = "TEXT")
    private String userProfileImageUrl;

    // 返信コメントのツリー構造を JSON 文字列で保存（Jackson からは hidden）
    @Getter(onMethod_ = @JsonIgnore)
    @Column(columnDefinition = "TEXT")
    private String childrenJson;

    // ─── user オブジェクト（Transient） ───────────────────────

    @Transient
    @JsonProperty("user")
    public Map<String, Object> getUser() {
        if (userName == null && userProfileImageUrl == null) return null;
        Map<String, Object> user = new HashMap<>();
        user.put("name", userName);
        user.put("profile_image", userProfileImageUrl);
        user.put("profile_image_90", userProfileImageUrl);
        return user;
    }

    @JsonProperty("user")
    public void setUser(Map<String, Object> user) {
        if (user != null) {
            Object name = user.get("name");
            Object img = user.get("profile_image_90") != null
                ? user.get("profile_image_90")
                : user.get("profile_image");
            this.userName = name != null ? name.toString() : null;
            this.userProfileImageUrl = img != null ? img.toString() : null;
        }
    }

    // ─── children ツリー（JSON 往復） ────────────────────────

    @Transient
    @JsonProperty("children")
    public List<Map<String, Object>> getChildrenTree() {
        if (childrenJson == null || childrenJson.isBlank()) return null;
        try {
            return MAPPER.readValue(childrenJson, new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    @JsonProperty("children")
    public void setChildrenTree(List<Map<String, Object>> children) {
        if (children == null || children.isEmpty()) {
            this.childrenJson = null;
            return;
        }
        try {
            this.childrenJson = MAPPER.writeValueAsString(children);
        } catch (Exception e) {
            this.childrenJson = null;
        }
    }
}
