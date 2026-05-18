# Demo PR: add widget cache

## TL;DR

| metric | value |
| :--- | :--- |
| Wall time before | 1450ms |
| Wall time after | 55ms |
| Reduction | 96% |

## Changes

- Added `WidgetCache` class
- Wired cache into `WidgetService.get_by_id()`

## Validation

| test_name | status | duration_ms |
| :--- | :--- | ---: |
| test_widget_cache_hit | pass | 12 |
| test_widget_cache_miss | pass | 18 |
| test_widget_eviction | pass | 9 |
