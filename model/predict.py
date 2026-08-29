from __future__ import annotations
import argparse, joblib, pandas as pd
from pathlib import Path
def main():
    p=argparse.ArgumentParser(); p.add_argument("model"); p.add_argument("text"); args=p.parse_args(); bundle=joblib.load(Path(args.model)); model=bundle['model']; frame=pd.DataFrame({'text':[args.text],'numeric_0':[len(args.text)],'numeric_1':[len(args.text.split())],'numeric_2':[len(args.text.split())],'numeric_3':[args.text.count('?')],'numeric_4':[args.text.count('\n')]}); pred=model.predict(frame); print(pred.tolist())
if __name__ == '__main__': main()
