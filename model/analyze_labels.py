from pathlib import Path
from model.dataset_loader import DatasetLoader
frame = DatasetLoader(Path('model/datasets'), 5000).load()

print('=== INTENT (top 15) ===')
print(frame['_intent_label'].value_counts().head(15).to_string())
total = frame['_intent_label'].nunique()
empty = (frame['_intent_label'].str.strip().isin(['','nan','None'])).sum()
print(f'\nUnique intents: {total}, Empty: {empty}/{len(frame)}')

print('\n=== SUCCESS ===')
print(frame['_success_label'].value_counts().head(10).to_string())

print('\n=== LATENCY (non-empty) ===')
lat = frame['_latency_label'][~frame['_latency_label'].str.strip().isin(['','nan','None'])]
print(f'Non-empty: {len(lat)}/{len(frame)}')
if len(lat) > 0:
    print(lat.astype(float).describe().to_string())

print('\n=== COST (non-empty) ===')
cost = frame['_cost_label'][~frame['_cost_label'].str.strip().isin(['','nan','None'])]
print(f'Non-empty: {len(cost)}/{len(frame)}')
if len(cost) > 0:
    print(cost.astype(float).describe().to_string())

print('\n=== APPROVAL ===')
print(frame['_approval_label'].value_counts().head(10).to_string())
