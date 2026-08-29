from __future__ import annotations
import json
from pathlib import Path
import argparse
def main():
 p=argparse.ArgumentParser(); p.add_argument('--output-dir',default='artifacts'); a=p.parse_args(); print(Path(a.output_dir,'training_report.json').read_text(encoding='utf-8'))
if __name__=='__main__': main()
