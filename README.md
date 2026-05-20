# HP Roleplay App — Scaffold

Bu repo HP Roleplay projesi için başlangıç iskeletini içerir.

- `backend/` : FastAPI uygulaması (stublar)
- `database/` : `schema.sql` ve `seed_data/`
- `frontend/` : React Native (expo) için placeholder

İleri adımlar:

1. Sanal ortam oluşturun ve backend bağımlılıklarını yükleyin:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

2. Backend'i çalıştırmak için:

```powershell
uvicorn backend.main:app --reload --port 8000
```

Vertex AI için servis hesabı JSON dosyanızı ortam değişkeni olarak bağlayın. En basit yol, proje kökünde `.env` dosyasına `GOOGLE_APPLICATION_CREDENTIALS=...` yolunu ve `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL` değerlerini yazmaktır.

## Tek tik calistirma (Windows)

Root klasorde bulunan `tek-tik-baslat.bat` dosyasina cift tiklayin.

Bu dosya sunlari yapar:

1. `backend` icin FastAPI/uvicorn baslatir (`8000`)
2. `frontend` klasorunu static server olarak baslatir (`5173`)
3. Tarayicida frontend sayfasini acar
