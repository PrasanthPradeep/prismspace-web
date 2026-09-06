from __future__ import annotations
import argparse, json, joblib, pandas as pd
from pathlib import Path


def _decode_prediction(bundle: dict, pred) -> object:
    label_encoder = bundle.get("label_encoder")
    if label_encoder is None:
        return pred.tolist()

    try:
        from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer

        if isinstance(label_encoder, MultiLabelBinarizer):
            labels = label_encoder.inverse_transform(pred)
            return [list(row) for row in labels]
        if isinstance(label_encoder, LabelEncoder):
            return label_encoder.inverse_transform(pred.astype(int)).tolist()
    except Exception:
        pass

    return pred.tolist()
def main():
    p=argparse.ArgumentParser(); p.add_argument("model"); p.add_argument("text"); args=p.parse_args(); bundle=joblib.load(Path(args.model)); model=bundle['model']; frame=pd.DataFrame({'text':[args.text],'numeric_0':[len(args.text)],'numeric_1':[len(args.text.split())],'numeric_2':[len(args.text.split())],'numeric_3':[args.text.count('?')],'numeric_4':[args.text.count('\n')]}); pred=model.predict(frame)
    confidence = None
    if hasattr(model, "predict_proba"):
        try:
            probabilities = model.predict_proba(frame)
            confidence = float(probabilities[0].max()) if not isinstance(probabilities, list) else max(float(item[0].max()) for item in probabilities)
        except Exception:
            pass
    print(json.dumps({"prediction": _decode_prediction(bundle, pred), "confidence": confidence}))
if __name__ == '__main__': main()
