# Merge_

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</div>

<br />

> **記事と知見を、ひとつにマージする。**
> 
> Merge は、技術記事の閲覧と個人のナレッジ管理をシームレスに統合する、エンジニアのための開発支援プラットフォームです。

<br />

## 📸 Screen Shots

| 記事閲覧 & メモ作成 | ダークモード UI |
| :---: | :---: |
| <img src="./assets/screenshot_main.jpg" alt="Main UI" width="400"/> | <img src="./assets/screenshot_editor.jpg" alt="Editor UI" width="400"/> |

## ✨ Features

- **Qiita Search Integration**: Qiitaの記事をアプリ内から直接検索・閲覧。ブラウザのタブを行き来する必要はありません。
- **Dual-Pane Knowledge Base**: 左画面で記事を読みながら、右画面でリアルタイムにメモを取れる2ペイン構成。
- **Smart Memo Restoration**: 記事を選択すると、過去に書いたメモが自動的に復元されます。思考のコンテキストを失いません。
- **Markdown Editor**: コードブロックやリストに対応したMarkdownエディタと、リアルタイムプレビュー機能を搭載。
- **Persistent Storage**: 記事データ（HTML）とメモはPostgreSQLに保存され、オフラインでも自分のナレッジとして参照可能。
- **Developer-Centric UI**: 長時間の作業でも目が疲れにくい、IDEライクなダークテーマを採用。

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Markdown**: react-markdown, remark-gfm

### Backend
- **Framework**: Spring Boot 3
- **Language**: Java 25
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA

### Infrastructure
- **Containerization**: Docker, Docker Compose

## 🚀 Getting Started

このプロジェクトは Docker Compose を使用して一発で起動できるように設計されています。

### Prerequisites
- Docker & Docker Compose
- Qiita Access Token (Optional but recommended)

### Installation

1. **リポジトリをクローン**
   ```bash
   git clone [https://github.com/your-username/Merge.git](https://github.com/your-username/Merge.git)
   cd Merge