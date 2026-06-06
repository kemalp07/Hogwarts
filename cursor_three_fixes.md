# Cursor Three Fixes

## FİX 4 — Puan dağılımı dengesiz
### Dosya: `backend/services/world_simulation.py` 

`simulate_world_events` fonksiyonundaki prompt'ta şu satırı bul:
"4 evin tümüne değinmek zorunda değilsin, doğal olsun"

Şununla değiştir:
"Her world_events çağrısında 4 evin TÜMÜNE değin — her ev en az bir olay alsın.
Bazı olaylar pozitif bazıları negatif olsun. Eğer bir ev sohbette hiç geçmediyse,
o eve arka planda bir şey olmuştur — Hufflepuff bahçe dersinde başarılı oldu,
Slytherin koridorda kavga çıkardı gibi. Hiçbir ev 0'da kalmasın."

Ayrıca `simulate_world_events` içindeki %60 ihtimal şartını %90'a çıkar:
```python
if random.random() > 0.9:  # eskisi 0.6
    return
```
