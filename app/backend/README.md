# Praman Setu — backend (demo)

Offline FastAPI backend for the Sewa Setu PS1 demo. All citizen data is SYNTHETIC; the MIS dashboard data is REAL.

```bash
./run.sh                         # http://localhost:8000 (first run builds data + model)
./reset_demo.sh                  # restore the demo state
uv run pytest -q                 # tests
uv run python scripts/export_fixtures.py   # offline fixtures for the frontend

# rebuild everything from scratch (deterministic)
uv run python gen_synthetic.py && uv run python train_model.py && uv run python evaluate.py
```

| File | Role |
|---|---|
| `gen_synthetic.py` | seeded population (3 generations, real LGD villages), certificate archive, 8 demo cases + background queue, mock Bhuiyan/Khadya rows → `data/synthetic/` |
| `normalise.py` | Devanagari→Latin (indic_transliteration + schwa deletion), honorific stripping, phonetic folding, consonant skeleton |
| `train_model.py` | Splink v4 (DuckDB) Fellegi–Sunter, EM → `model/model.json` (m/u/weights per level) |
| `matcher.py` | pure-Python runtime scorer reproducing the Splink levels; blocking; weight waterfall |
| `evaluate.py` | held-out families → `model/eval.json` |
| `rules.py` | validity checks, caste synonym table, Sewa Setu checklists, deficiencies |
| `engine.py` | builds the `Analysis` (lanes, flags, draft order) and the Kendra pre-check |
| `messages.py`, `templates/` | Jinja2 bilingual orders and citizen messages + entity checker |
| `api.py` | every endpoint in `../CONTRACT.md` |
