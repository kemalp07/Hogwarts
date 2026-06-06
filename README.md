# Hogwarts Roleplay

1991–92 Hogwarts evreninde AI destekli rol yapma uygulaması. FastAPI backend + web frontend.

## Hızlı başlangıç (Windows)

Proje kökünde `tek-tik-baslat.bat` dosyasına çift tıklayın.

İlk çalıştırmada (Python/Node yoksa) otomatik kurulum yapılır; sonraki açılışlar ~5 saniyede başlar.

| Servis   | Adres                    |
|----------|--------------------------|
| Frontend | http://localhost:5173    |
| Backend  | http://localhost:8001    |

Bat dosyası `.venv` ve `frontend/node_modules` varsa kurulum adımlarını atlar.

---

## Manuel kurulum

### 1. Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın ve doldurun:

```powershell
copy .env.example .env
```

| Değişken | Açıklama |
|----------|----------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Google Cloud servis hesabı JSON yolu |
| `VERTEX_AI_PROJECT_ID` | GCP proje ID |
| `VERTEX_AI_LOCATION` | Örn. `us-central1` |
| `VERTEX_AI_MODEL` | Örn. `gemini-2.0-flash-001` |
| `SUPABASE_URL` | Supabase proje URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_ANON_KEY` | Supabase anon key (opsiyonel) |

### 2. Supabase migration'ları

Supabase Dashboard → **SQL Editor**'da sırayla çalıştırın:

1. `database/schema.sql` — temel tablolar (yeni proje)
2. `database/migrations/001_add_simulation_event_sources.sql`
3. `database/migrations/002_add_organic_drift_source.sql`
4. `database/migrations/003_character_relationships.sql`
5. `database/migrations/004_add_relationship_type.sql`
6. `database/migrations/005_add_daily_message_count.sql`

Mevcut bir veritabanında yalnızca migration dosyalarını (001–005) çalıştırmanız yeterli.

### 3. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --reload --port 8001
```

### 4. Frontend

```powershell
cd frontend
npm install
npx serve . -l 5173
```

Tarayıcıda http://localhost:5173 adresine gidin.

---

## Proje yapısı

```
backend/          FastAPI API (chat, simulation, schedule, house points)
frontend/         Web arayüzü (React Native Web)
database/         schema.sql, migrations/, seed_data/
tek-tik-baslat.bat  Tek tıkla kurulum + başlatma (Windows)
```

---

## Önemli API uçları

| Endpoint | Açıklama |
|----------|----------|
| `POST /api/chat` | AI sohbet (SSE) |
| `POST /api/run-simulation` | Puan + ilişki simülasyonu |
| `GET /api/schedule` | Günlük ders programı |
| `GET /api/house-points` | Ev puanları |
| `POST /api/set-house` | Oyuncu evi (ilk gece: Pazar 20:00) |

Frontend backend'e **8001** portundan bağlanır (`aiService.ts`, `ChatScreen.web.tsx`).

---

## Geliştirme notları

- Backend yeniden başlatıldığında `school_calendar.json` cache'i temizlenir.
- Organic drift scheduler backend startup'ta otomatik başlar (30 sn).
- İlk ev seçiminden sonra `game_state`: hafta 1, gün 7 (Pazar), saat 20.
