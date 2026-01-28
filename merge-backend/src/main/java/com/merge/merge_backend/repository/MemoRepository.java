package com.merge.merge_backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.merge.merge_backend.entity.Memo;

import java.util.List;

@Repository
public interface MemoRepository extends JpaRepository<Memo, Long> {
    List<Memo> findByArticleIdAndDeleteFlgFalseOrderByCreatedAtDesc(Long articleId);
}