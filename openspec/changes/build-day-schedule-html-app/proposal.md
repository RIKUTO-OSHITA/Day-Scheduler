## Why

1日の業務予定を、見通しの良い時間軸で入力・確認できる手段が必要である。特に 7:30-18:00 の範囲で、15分単位の時刻入力と日付表示を備えた HTML 出力のスケジュール画面を早期に利用開始したい。

## What Changes

- Outlook 風レイアウトの 1日スケジュール画面を提供する。
- 表示対象時間を 7:30 から 18:00 に固定する。
- タスク時刻の入力・編集を 15 分刻みで制約する。
- 画面左上に、表示中の日付を明示する。
- 最終成果物をブラウザで開ける HTML として実装する。

## Capabilities

### New Capabilities
- `daily-schedule-planning`: 1日スケジュール表示、15分刻み入力、日付表示を含む HTML ベースのタスク管理体験を定義する。

### Modified Capabilities
- なし（既存 capability は未作成）。

## Impact

- Affected specs: `openspec/changes/build-day-schedule-html-app/specs/daily-schedule-planning/spec.md`（新規）。
- Affected implementation: HTML/CSS/JavaScript によるシングルページのスケジュール UI。
- 外部 API や追加インフラ依存は想定しない。
