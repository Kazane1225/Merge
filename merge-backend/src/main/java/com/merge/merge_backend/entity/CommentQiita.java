package com.merge.merge_backend.entity;

import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonProperty;

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

@Entity
@Data
@EqualsAndHashCode(callSuper=false)
public class CommentQiita extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Long id;

    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "article_id")
    private Article article;

    @Column(columnDefinition = "TEXT")
    @JsonProperty("rendered_body")
    private String renderedBody;

    // user.id (Qiita username)
    @Column
    private String userId;

    // user.profile_image_url
    @Column(columnDefinition = "TEXT")
    private String userProfileImageUrl;

    @Transient
    @JsonProperty("user")
    public Map<String, Object> getUser() {
        if (userId == null && userProfileImageUrl == null) return null;
        Map<String, Object> user = new HashMap<>();
        user.put("id", userId);
        user.put("profile_image_url", userProfileImageUrl);
        return user;
    }

    @JsonProperty("user")
    public void setUser(Map<String, Object> user) {
        if (user != null) {
            Object id = user.get("id");
            Object img = user.get("profile_image_url");
            this.userId = id != null ? id.toString() : null;
            this.userProfileImageUrl = img != null ? img.toString() : null;
        }
    }
}
