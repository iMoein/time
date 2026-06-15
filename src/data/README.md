# داده‌های JSON استفاده‌شده در برنامه

این سند فقط فایل‌های JSONای را فهرست می‌کند که مستقیماً در `src/main.js` import شده‌اند و برنامه از آن‌ها استفاده می‌کند. فایل‌های JSON دیگری که در این پوشه وجود دارند اما در `src/main.js` import نشده‌اند، عمداً در جدول نیامده‌اند.

## فایل‌های مستقیم در `src/data`

| فایل | کاربرد در برنامه |
| --- | --- |
| `occasions-gregorian.json` | مناسبت‌های تقویم میلادی / بین‌المللی |
| `occasions-persian.json` | مناسبت‌های تقویم خورشیدی ایران |
| `occasions-islamic.json` | مناسبت‌های تقویم قمری/اسلامی پایه |
| `islamic-year-start-sync.json` | داده همگام‌سازی شروع سال قمری با تاریخ میلادی |
| `year-options.json` | گزینه‌ها و محدوده‌های سال برای تقویم‌ها |
| `solar-year-moments.json` | لحظه‌های تحویل سال خورشیدی و اطلاعات مرتبط |
| `card-order.json` | ترتیب نمایش کارت‌های اصلی رابط کاربری |
| `official-holidays.json` | تنظیمات تعطیلی‌های رسمی و تعطیلی‌های هفتگی |
| `i18n.json` | متن‌ها و ترجمه‌های رابط کاربری |
| `city-translations-fa.json` | ترجمه فارسی نام شهرها/منطقه‌های زمانی |
| `occasion-descriptions.json` | توضیحات تکمیلی مناسبت‌ها |

## فایل‌های استفاده‌شده از زیرپوشه `calendar-files`

فایل‌های JSON استفاده‌شده در `src/data/calendar-files` در README همان پوشه مستند شده‌اند:

- [`calendar-files/README.md`](./calendar-files/README.md)
