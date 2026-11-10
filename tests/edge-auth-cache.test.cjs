/* Chạy bộ test của cache xác minh JWT (TypeScript thuần, node:test) trong `npm test`.
   Cùng file cũng chạy được bằng `deno test` trong CI Edge. Cần Node có strip-types (22.18+/24). */
'use strict';
import('../supabase/functions/api/auth-cache.test.ts');
